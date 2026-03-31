import {fireEvent, render, screen, waitFor} from "@testing-library/react";
import {ItemPage} from "./ItemPage";
import {resetClerkState, setClerkState} from "../testUtils/mockClerk";

const mockNavigate = jest.fn();
const mockCreateConversation = jest.fn();
const mockShowToast = jest.fn();
const mockConfirm = jest.fn(() => Promise.resolve(true));

jest.mock("@clerk/react", () => {
  const React = require("react");
  const {getClerkState} = require("../testUtils/mockClerk");

  return {
    SignInButton: ({children}) => React.createElement(React.Fragment, null, children),
    useUser: () => getClerkState(),
  };
});

jest.mock("../lib/messagesApi", () => ({
  createConversation: (...args) => mockCreateConversation(...args),
}));

jest.mock("../components/ui", () => {
  const actual = jest.requireActual("../components/ui");

  return {
    ...actual,
    useToast: () => ({
      showToast: mockShowToast,
    }),
    useConfirmDialog: () => ({
      confirm: mockConfirm,
    }),
  };
});

jest.mock(
  "react-router-dom",
  () => {
  const React = require("react");
  return {
    Link: ({children, to, ...props}) => React.createElement("a", {href: to, ...props}, children),
    useParams: () => ({id: "item-1"}),
    useNavigate: () => mockNavigate,
  };
},
  {virtual: true}
);

function jsonResponse(body, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

beforeEach(() => {
  resetClerkState();
  global.fetch = jest.fn((url, options = {}) => {
    if (url === "http://localhost:5000/items/item-1") {
      return jsonResponse({
        _id: "item-1",
        itemName: "Desk Lamp",
        itemCost: "20",
        itemCondition: "Good",
        itemLocation: "Library West",
        itemPicture: "lamp.png",
        itemDescription: "Lamp for studying",
        itemDetails: "Warm bulb included",
        userPublishingID: "seller-1",
        userPublishingName: "Seller One",
      });
    }

    if (url === "http://localhost:5000/profile/buyer-1") {
      return jsonResponse({
        profile: {
          profileFavorites: ["item-1"],
        },
      });
    }

    if (url === "http://localhost:5000/profile/seller-1") {
      return jsonResponse({
        profile: {
          profileFavorites: [],
        },
      });
    }

    if (url === "http://localhost:5000/item/item-1" && options.method === "DELETE") {
      return jsonResponse({message: "Listing deleted"});
    }

    if (url === "http://localhost:5000/user/buyer-1/fav/item-1") {
      return jsonResponse({profileFavorites: []});
    }

    throw new Error(`Unhandled fetch request: ${url}`);
  });
  mockNavigate.mockReset();
  mockCreateConversation.mockReset();
  mockShowToast.mockReset();
  mockConfirm.mockReset();
  mockConfirm.mockResolvedValue(true);
});

afterEach(() => {
  delete global.fetch;
});

test("signed-out users can view the item and see a login CTA", async () => {
  render(<ItemPage />);

  expect(await screen.findByRole("heading", {name: "Desk Lamp"})).toBeInTheDocument();
  expect(screen.getByRole("button", {name: /log in to message seller/i})).toBeInTheDocument();
  expect(screen.queryByRole("button", {name: /favorite/i})).not.toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

test("signed-in non-owners still see the item when favorite lookup fails", async () => {
  setClerkState({
    isSignedIn: true,
    user: {
      id: "buyer-1",
    },
  });
  global.fetch.mockImplementation((url, options = {}) => {
    if (url === "http://localhost:5000/items/item-1") {
      return jsonResponse({
        _id: "item-1",
        itemName: "Desk Lamp",
        itemCost: "20",
        itemCondition: "Good",
        itemLocation: "Library West",
        itemPicture: "lamp.png",
        itemDescription: "Lamp for studying",
        itemDetails: "Warm bulb included",
        userPublishingID: "seller-1",
        userPublishingName: "Seller One",
      });
    }

    if (url === "http://localhost:5000/profile/buyer-1") {
      return jsonResponse({message: "No profile"}, 404);
    }

    throw new Error(`Unhandled fetch request: ${url}`);
  });

  render(<ItemPage />);

  expect(await screen.findByRole("heading", {name: "Desk Lamp"})).toBeInTheDocument();
  expect(screen.getByRole("button", {name: /favorite/i})).toBeInTheDocument();
  expect(screen.getByRole("button", {name: /message seller/i})).toBeInTheDocument();
});

test("signed-in owners see the delete control", async () => {
  setClerkState({
    isSignedIn: true,
    user: {
      id: "seller-1",
    },
  });

  render(<ItemPage />);

  expect(await screen.findByRole("button", {name: /delete listing/i})).toBeInTheDocument();
  expect(screen.queryByRole("button", {name: /favorite/i})).not.toBeInTheDocument();
});

test("successful delete only navigates after a successful response", async () => {
  setClerkState({
    isSignedIn: true,
    user: {
      id: "seller-1",
    },
  });

  render(<ItemPage />);

  fireEvent.click(await screen.findByRole("button", {name: /delete listing/i}));

  await waitFor(() => {
    expect(mockNavigate).toHaveBeenCalledWith("/listings");
  });
  expect(mockConfirm).toHaveBeenCalled();
  expect(mockShowToast).toHaveBeenCalledWith(
    expect.objectContaining({
      title: "Listing deleted",
      variant: "success",
    })
  );
});

test("failed delete stays on the page and shows an error", async () => {
  setClerkState({
    isSignedIn: true,
    user: {
      id: "seller-1",
    },
  });
  global.fetch.mockImplementation((url, options = {}) => {
    if (url === "http://localhost:5000/items/item-1") {
      return jsonResponse({
        _id: "item-1",
        itemName: "Desk Lamp",
        itemCost: "20",
        itemCondition: "Good",
        itemLocation: "Library West",
        itemPicture: "lamp.png",
        itemDescription: "Lamp for studying",
        itemDetails: "Warm bulb included",
        userPublishingID: "seller-1",
        userPublishingName: "Seller One",
      });
    }

    if (url === "http://localhost:5000/profile/seller-1") {
      return jsonResponse({
        profile: {
          profileFavorites: [],
        },
      });
    }

    if (url === "http://localhost:5000/item/item-1" && options.method === "DELETE") {
      return jsonResponse({message: "Failed"}, 500);
    }

    throw new Error(`Unhandled fetch request: ${url}`);
  });

  render(<ItemPage />);

  fireEvent.click(await screen.findByRole("button", {name: /delete listing/i}));

  expect(await screen.findByText("Error during delete")).toBeInTheDocument();
  expect(mockNavigate).not.toHaveBeenCalled();
  expect(mockShowToast).not.toHaveBeenCalled();
});
