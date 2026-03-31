import {fireEvent, render, screen} from "@testing-library/react";
import {HomePage} from "./HomePage";
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
  <div>{item?.title || data?.itemName || data?.title}</div>
));

function jsonResponse(body, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

beforeEach(() => {
  resetClerkState();
  mockItems = [];
  global.fetch = jest.fn(() => jsonResponse(mockItems));
});

afterEach(() => {
  delete global.fetch;
});

test("signed-out users see the landing hero and auth CTA", async () => {
  render(<HomePage />);

  expect(
    screen.getByText(/buy, sell, and trade around campus without the usual chaos/i)
  ).toBeInTheDocument();
  expect(screen.getByRole("button", {name: /create account/i})).toBeInTheDocument();
  expect(screen.getByRole("button", {name: /log in/i})).toBeInTheDocument();
  expect(global.fetch).not.toHaveBeenCalled();
});

test("signed-in users see the listings feed, category chips, and cards", async () => {
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
