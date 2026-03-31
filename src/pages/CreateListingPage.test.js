import {fireEvent, render, screen, waitFor} from "@testing-library/react";
import {CreateListingPage} from "./CreateListingPage";
import {resetClerkState, setClerkState} from "../testUtils/mockClerk";

const mockNavigate = jest.fn();

jest.mock("@clerk/react", () => {
  const {getClerkState} = require("../testUtils/mockClerk");

  return {
    useUser: () => getClerkState(),
  };
});

jest.mock(
  "react-router-dom",
  () => ({
    useNavigate: () => mockNavigate,
  }),
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
  setClerkState({
    isSignedIn: true,
    user: {
      id: "seller-1",
      fullName: "Seller One",
    },
  });

  global.fetch = jest.fn(() => jsonResponse({_id: "item-1"}, 201));
  mockNavigate.mockReset();
  window.alert = jest.fn();

  global.FileReader = class MockFileReader {
    readAsDataURL() {
      this.result = "data:image/png;base64,preview";
      setTimeout(() => {
        this.onloadend?.();
      }, 0);
    }
  };
});

afterEach(() => {
  delete global.fetch;
  delete global.FileReader;
});

test("successful submit posts the listing and navigates home", async () => {
  const {container} = render(<CreateListingPage />);
  const selects = screen.getAllByRole("combobox");

  fireEvent.change(screen.getByPlaceholderText("Item Name"), {
    target: {value: "Desk Lamp"},
  });
  fireEvent.change(screen.getByPlaceholderText("Item Price (USD)"), {
    target: {value: "20"},
  });
  fireEvent.change(selects[0], {
    target: {value: "Good"},
  });
  fireEvent.change(screen.getByPlaceholderText("Item Location"), {
    target: {value: "Library West"},
  });
  fireEvent.change(container.querySelector('input[type="file"]'), {
    target: {
      files: [new File(["lamp"], "lamp.png", {type: "image/png"})],
    },
  });
  expect(await screen.findByAltText("preview")).toBeInTheDocument();
  fireEvent.change(screen.getByPlaceholderText("Item Description"), {
    target: {value: "Lamp for studying"},
  });
  fireEvent.change(screen.getByPlaceholderText("Item Details"), {
    target: {value: "Warm bulb included"},
  });
  fireEvent.change(selects[1], {
    target: {value: "Miscellaneous"},
  });

  fireEvent.click(screen.getByRole("button", {name: /create listing/i}));

  await waitFor(() => {
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  expect(global.fetch).toHaveBeenCalledWith(
    "http://localhost:5000/create-item",
    expect.objectContaining({
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    })
  );

  expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toEqual(
    expect.objectContaining({
      itemName: "Desk Lamp",
      itemCost: "20",
      itemCondition: "Good",
      itemLocation: "Library West",
      itemPicture: "data:image/png;base64,preview",
      itemDescription: "Lamp for studying",
      itemDetails: "Warm bulb included",
      userPublishingID: "seller-1",
      userPublishingName: "Seller One",
      itemCat: "Miscellaneous",
    })
  );

  await waitFor(() => {
    expect(window.alert).toHaveBeenCalledWith("Item Created");
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });
});
