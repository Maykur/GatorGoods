import {fireEvent, render, screen} from "@testing-library/react";
import {HomePage} from "./HomePage";
import {clearListingsCache} from "../lib/listingsApi";
import {resetClerkState, setClerkState} from "../testUtils/mockClerk";

let mockItems = [];

jest.mock("@clerk/react", () => {
  const React = require("react");
  const {getClerkState} = require("../testUtils/mockClerk");

  return {
    Show: ({children, fallback, when}) => {
      const {isSignedIn} = getClerkState();
      const shouldRender = when === "signed-in" ? isSignedIn : !isSignedIn;

      return shouldRender ? React.createElement(React.Fragment, null, children) : fallback || null;
    },
    SignInButton: ({children}) => React.createElement(React.Fragment, null, children),
    SignUpButton: ({children}) => React.createElement(React.Fragment, null, children),
    useUser: () => getClerkState(),
  };
});

jest.mock(
  "react-router-dom",
  () => {
    const React = require("react");

    return {
      Link: ({children, to, ...props}) => React.createElement("a", {href: to, ...props}, children),
    };
  },
  {virtual: true}
);

jest.mock("../components/HomePage/ProductCard.js", () => ({item, data}) => (
  <div>
    <span>{item?.title || data?.itemName || data?.title}</span>
    <span data-testid={`location-${item?.id || data?._id || data?.id || "listing"}`}>
      {item?.location || data?.itemLocation || ""}
    </span>
  </div>
));

function jsonResponse(body, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

function buildPaginatedItemsResponse(url, items) {
  const parsedUrl = new URL(url);
  const page = Number(parsedUrl.searchParams.get("page") || "1");
  const limit = Number(parsedUrl.searchParams.get("limit") || "9");
  const search = (parsedUrl.searchParams.get("search") || "").toLowerCase();
  const category = parsedUrl.searchParams.get("category") || "All";
  const pickupLocation = parsedUrl.searchParams.get("pickupLocation") || "All";
  const sort = parsedUrl.searchParams.get("sort") || "newest";

  let filteredItems = items.filter((item) => {
    const matchesCategory = category === "All" || item.itemCat === category;
    const matchesPickupLocation = pickupLocation === "All" || item.itemLocation === pickupLocation;
    const haystack = [
      item.itemName,
      item.itemLocation,
      item.userPublishingName,
      item.itemCat,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return matchesCategory && matchesPickupLocation && (!search || haystack.includes(search));
  });

  if (sort === "title") {
    filteredItems = [...filteredItems].sort((first, second) =>
      first.itemName.localeCompare(second.itemName)
    );
  }

  const totalItems = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * limit;
  const pageItems = filteredItems.slice(startIndex, startIndex + limit);

  return {
    items: pageItems,
    meta: {
      page: safePage,
      limit,
      totalItems,
      totalPages,
      hasNextPage: safePage < totalPages,
      hasPreviousPage: safePage > 1,
    },
  };
}

beforeEach(() => {
  resetClerkState();
  clearListingsCache();
  mockItems = [];
  global.fetch = jest.fn((url) => {
    if (String(url).includes("/items?")) {
      return jsonResponse(buildPaginatedItemsResponse(url, mockItems));
    }

    return jsonResponse(mockItems);
  });
});

afterEach(() => {
  clearListingsCache();
  delete global.fetch;
});

test("signed-out users see the landing hero and auth CTA", async () => {
  render(<HomePage forceSignedOutView />);

  expect(
    screen.getByText(/buy, sell, and trade around campus\./i)
  ).toBeInTheDocument();
  expect(screen.getByRole("button", {name: /create account/i})).toBeInTheDocument();
  expect(screen.getByRole("button", {name: /log in/i})).toBeInTheDocument();
  expect(global.fetch).not.toHaveBeenCalled();
});

test("landing hero keeps auth CTAs visible while Clerk is still loading", () => {
  setClerkState({
    isLoaded: false,
    isSignedIn: false,
  });

  render(<HomePage forceSignedOutView />);

  expect(screen.getByRole("button", {name: /create account/i})).toBeInTheDocument();
  expect(screen.getByRole("button", {name: /log in/i})).toBeInTheDocument();
  expect(global.fetch).not.toHaveBeenCalled();
});

test("signed-out users can browse the listings feed, category chips, and cards", async () => {
  mockItems = [
    {
      _id: "item-1",
      itemName: "Desk Lamp",
      itemCat: "Electronics & Computers",
    },
    {
      _id: "item-2",
      itemName: "Bike Helmet",
      itemCat: "Miscellaneous",
    },
  ];

  render(<HomePage />);

  expect(await screen.findByText(/browse campus listings/i)).toBeInTheDocument();
  expect(screen.getByRole("button", {name: "All"})).toBeInTheDocument();
  expect(await screen.findByRole("button", {name: "Electronics & Computers"})).toBeInTheDocument();
  expect(screen.getByText("Miscellaneous")).toBeInTheDocument();
  expect(screen.getByText("Desk Lamp")).toBeInTheDocument();
  expect(screen.getByText("Bike Helmet")).toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledWith(
    expect.stringContaining("/items?page=1&limit=9&sort=newest")
  );
});

test("browse users can filter listings by pickup location", async () => {
  mockItems = [
    {
      _id: "item-1",
      itemName: "Desk Lamp",
      itemCat: "Electronics & Computers",
      itemLocation: "Library West",
    },
    {
      _id: "item-2",
      itemName: "Dorm Rug",
      itemCat: "Home & Garden",
      itemLocation: "Reitz Union",
    },
  ];

  render(<HomePage />);

  const locationSelect = await screen.findByLabelText(/pickup location/i);
  fireEvent.change(locationSelect, {
    target: {value: "Reitz Union"},
  });

  expect(await screen.findByText("Dorm Rug")).toBeInTheDocument();
  expect(screen.queryByText("Desk Lamp")).not.toBeInTheDocument();
  expect(global.fetch).toHaveBeenLastCalledWith(
    expect.stringContaining("pickupLocation=Reitz+Union")
  );
});

test("public browse cards show the original public hub instead of the negotiated current hub", async () => {
  mockItems = [
    {
      _id: "item-1",
      itemName: "Desk Lamp",
      itemCat: "Electronics & Computers",
      originalPickupHubId: "library-west",
      originalItemLocation: "Library West",
      pickupHubId: "reitz",
      itemLocation: "Reitz Union",
    },
  ];

  render(<HomePage />);

  expect(await screen.findByText("Desk Lamp")).toBeInTheDocument();
  expect(screen.getByTestId("location-item-1")).toHaveTextContent("Library West");
  expect(screen.getByTestId("location-item-1")).not.toHaveTextContent("Reitz Union");
});

test("signed-in users still see the create listing action in the feed header", async () => {
  setClerkState({
    isSignedIn: true,
    user: {
      id: "buyer-1",
    },
  });
  mockItems = [
    {
      _id: "item-1",
      itemName: "Desk Lamp",
      itemCat: "Electronics & Computers",
    },
  ];

  render(<HomePage />);

  expect(await screen.findByText(/browse campus listings/i)).toBeInTheDocument();
  expect(screen.getByRole("button", {name: /create listing/i})).toBeInTheDocument();
});

test('signed-in users can filter listings with missing categories under "Miscellaneous"', async () => {
  setClerkState({
    isSignedIn: true,
    user: {
      id: "buyer-1",
    },
  });
  mockItems = [
    {
      _id: "item-1",
      itemName: "Uncategorized Chair",
      itemCat: "",
    },
  ];

  render(<HomePage />);

  expect(await screen.findByText("Miscellaneous")).toBeInTheDocument();
  expect(screen.getByText("Uncategorized Chair")).toBeInTheDocument();
});

test("signed-in users see the designed empty state when filters remove every listing", async () => {
  setClerkState({
    isSignedIn: true,
    user: {
      id: "buyer-1",
    },
  });
  mockItems = [
    {
      _id: "item-1",
      itemName: "Desk Lamp",
      itemCat: "Electronics & Computers",
      itemCost: "20",
      itemCondition: "Good",
      itemLocation: "Library West",
      userPublishingName: "Seller One",
    },
  ];

  render(<HomePage />);

  const searchInput = await screen.findByLabelText(/search listings/i);
  expect(searchInput).toBeInTheDocument();

  fireEvent.change(searchInput, {
    target: {value: "not-a-match"},
  });

  expect(await screen.findByText(/no listings match your current filters/i)).toBeInTheDocument();
});

test("signed-in users can paginate through listings", async () => {
  setClerkState({
    isSignedIn: true,
    user: {
      id: "buyer-1",
    },
  });

  mockItems = Array.from({length: 11}, (_, index) => ({
    _id: `item-${index + 1}`,
    itemName: `Listing ${index + 1}`,
    itemCat: index % 2 === 0 ? "Miscellaneous" : "Electronics & Computers",
    itemCost: String(index + 1),
    itemCondition: "Good",
    itemLocation: "Library West",
    userPublishingName: "Seller One",
  }));

  render(<HomePage />);

  expect(await screen.findByText("Listing 1")).toBeInTheDocument();
  expect(screen.queryByText("Listing 10")).not.toBeInTheDocument();

  fireEvent.click(await screen.findByRole("button", {name: /next/i}));

  expect(await screen.findByText("Listing 10")).toBeInTheDocument();
  expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
});
