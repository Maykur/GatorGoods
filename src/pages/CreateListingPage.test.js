import {fireEvent, render, screen, waitFor} from "@testing-library/react";
import {CreateListingPage} from "./CreateListingPage";
import {resetClerkState, setClerkState} from "../testUtils/mockClerk";

const mockNavigate = jest.fn();
const mockShowToast = jest.fn();

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

jest.mock("../components/ui", () => {
  const actual = jest.requireActual("../components/ui");

  return {
    ...actual,
    useToast: () => ({
      showToast: mockShowToast,
    }),
  };
});

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
  mockShowToast.mockReset();

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

  fireEvent.change(screen.getByLabelText(/item name/i), {
    target: {value: "Desk Lamp"},
  });
  fireEvent.change(screen.getByLabelText(/^price/i), {
    target: {value: "20"},
  });
  fireEvent.change(screen.getByLabelText(/condition/i), {
    target: {value: "Good"},
  });
  fireEvent.click(screen.getByRole("radio", {name: /library west/i}));
  fireEvent.change(container.querySelector('input[type="file"]'), {
    target: {
      files: [new File(["lamp"], "lamp.png", {type: "image/png"})],
    },
  });
  expect(await screen.findByAltText("preview")).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText(/description/i), {
    target: {value: "Lamp for studying"},
  });
  fireEvent.change(screen.getByLabelText(/details/i), {
    target: {value: "Warm bulb included"},
  });
  fireEvent.change(screen.getByLabelText(/category/i), {
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
      pickupHubId: "library-west",
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
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Listing created",
        variant: "success",
      })
    );
    expect(mockNavigate).toHaveBeenCalledWith("/listings");
  });
});

test("create listing requires an approved pickup hub selection", async () => {
  render(<CreateListingPage />);

  fireEvent.click(screen.getByRole("button", {name: /create listing/i}));

  expect(await screen.findByText(/pickup hub is required\./i)).toBeInTheDocument();
  expect(global.fetch).not.toHaveBeenCalled();
});

test("selected pickup hub appears in the live preview before submit", async () => {
  render(<CreateListingPage />);

  fireEvent.click(screen.getByRole("radio", {name: /reitz union/i}));

  expect(await screen.findAllByText("Reitz Union")).toHaveLength(3);
  expect(screen.queryByText(/public campus pickup hub appears here/i)).not.toBeInTheDocument();
});
