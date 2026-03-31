import {render, screen} from "@testing-library/react";
import {ProfilePage} from "./ProfilePage";
import {resetClerkState, setClerkState} from "../testUtils/mockClerk";

jest.mock("@clerk/react", () => {
  const {getClerkState} = require("../testUtils/mockClerk");

  return {
    useUser: () => getClerkState(),
  };
});

jest.mock(
  "react-router-dom",
  () => {
    const React = require("react");

    return {
      Link: ({children, to, ...props}) => React.createElement("a", {href: to, ...props}, children),
      useParams: () => ({id: "seller-1"}),
    };
  },
  {virtual: true}
);

jest.mock("../components/ProfilePage/ItemCard", () => () => <div>ItemCard Content</div>);
jest.mock("../components/ProfilePage/FavCard", () => () => <div>FavCard Content</div>);

function jsonResponse(body, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

beforeEach(() => {
  resetClerkState();
  global.fetch = jest.fn(() =>
    jsonResponse({
      profile: {
        profileID: "seller-1",
        profileName: "Seller One",
        profilePicture: "",
        profileRating: 4.5,
        profileFavorites: ["item-1", "item-2"],
      },
      listings: [
        {
          _id: "item-1",
          itemName: "Desk Lamp",
        },
      ],
    })
  );
});

afterEach(() => {
  delete global.fetch;
});

test("signed-out users can view a public profile without owner-only controls", async () => {
  render(<ProfilePage />);

  expect(await screen.findByText("Seller One")).toBeInTheDocument();
  expect(screen.getByText("1 active listing(s)")).toBeInTheDocument();
  expect(screen.queryByText("Favorited Orders")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", {name: /submit review score/i})).not.toBeInTheDocument();
});

test("signed-in owners see owner-only profile content", async () => {
  setClerkState({
    isSignedIn: true,
    user: {
      id: "seller-1",
    },
  });

  render(<ProfilePage />);

  expect(await screen.findByText("2 listing(s) favorited")).toBeInTheDocument();
  expect(screen.getByText("Favorited Orders")).toBeInTheDocument();
});

test("signed-in non-owners can see the review UI", async () => {
  setClerkState({
    isSignedIn: true,
    user: {
      id: "buyer-1",
    },
  });

  render(<ProfilePage />);

  expect(await screen.findByText("Submit Review Score")).toBeInTheDocument();
});
