import {render, screen} from "@testing-library/react";
import App from "./App";
import {resetClerkState, setClerkState} from "./testUtils/mockClerk";

jest.mock("@clerk/react", () => {
  const React = require("react");
  const {getClerkState} = require("./testUtils/mockClerk");

  return {
    Show: ({children, fallback, when}) => {
      const {isSignedIn} = getClerkState();
      const shouldRender = when === "signed-in" ? isSignedIn : !isSignedIn;

      return shouldRender ? React.createElement(React.Fragment, null, children) : fallback || null;
    },
    SignIn: () => React.createElement("div", null, "Login Page"),
    SignInButton: ({children}) => React.createElement(React.Fragment, null, children),
    SignUp: () => React.createElement("div", null, "Sign Up Page"),
    SignUpButton: ({children}) => React.createElement(React.Fragment, null, children),
    UserButton: () => React.createElement("div", null, "User"),
    useUser: () => getClerkState(),
  };
});

jest.mock(
  "react-router-dom",
  () => {
    const React = require("react");
    const OutletContext = React.createContext(null);

    function matchPath(pattern, path) {
      if (!pattern) {
        return false;
      }

      if (pattern === "*") {
        return true;
      }

      const patternParts = pattern.split("/").filter(Boolean);
      const pathParts = path.split("/").filter(Boolean);

      if (patternParts.length !== pathParts.length) {
        return false;
      }

      return patternParts.every((part, index) => part.startsWith(":") || part === pathParts[index]);
    }

    function getClassName(className) {
      if (typeof className === "function") {
        return className({isActive: false});
      }

      return className;
    }

    return {
      BrowserRouter: ({children}) => React.createElement(React.Fragment, null, children),
      Link: ({children, to, ...props}) => React.createElement("a", {href: to, ...props}, children),
      Navigate: ({to}) => {
        global.window.history.pushState({}, "", to);
        return null;
      },
      NavLink: ({children, to, className, end, ...props}) =>
        React.createElement("a", {href: to, className: getClassName(className), ...props}, children),
      Outlet: () => React.useContext(OutletContext),
      Route: () => null,
      Routes: ({children}) => {
        const currentPath = global.window.location.pathname;
        const routeElements = React.Children.toArray(children);
        let layoutElement = null;
        let matchedElement = null;

        routeElements.forEach((routeElement) => {
          if (!routeElement?.props?.path) {
            layoutElement = routeElement.props.element;

            React.Children.toArray(routeElement.props.children).forEach((nestedRoute) => {
              if (!matchedElement && matchPath(nestedRoute.props.path, currentPath)) {
                matchedElement = nestedRoute.props.element;
              }
            });
            return;
          }

          if (!matchedElement && matchPath(routeElement.props.path, currentPath)) {
            matchedElement = routeElement.props.element;
          }
        });

        if (layoutElement) {
          return React.createElement(OutletContext.Provider, {value: matchedElement}, layoutElement);
        }

        return matchedElement;
      },
      useLocation: () => ({pathname: global.window.location.pathname}),
    };
  },
  {virtual: true}
);

jest.mock("./components/UserProfile", () => ({
  UserProfile: () => null,
}));

jest.mock("./pages/HomePage", () => ({
  HomePage: () => <div>Home Page</div>,
}));

jest.mock("./pages/LoginPage", () => ({
  LoginPage: () => <div>Login Page</div>,
}));

jest.mock("./pages/signup", () => ({
  SignUp: () => <div>Sign Up Page</div>,
}));

jest.mock("./pages/CreateListingPage", () => ({
  CreateListingPage: () => <div>Create Listing Page</div>,
}));

jest.mock("./pages/OffersPage", () => ({
  OffersPage: () => <div>Offers Page</div>,
}));

jest.mock("./pages/MessagesPage", () => ({
  MessagesPage: () => <div>Messages Page</div>,
}));

jest.mock("./pages/ChatThreadPage", () => ({
  ChatThreadPage: () => <div>Chat Thread Page</div>,
}));

jest.mock("./pages/ProfilePage", () => ({
  ProfilePage: () => <div>Profile Page</div>,
}));

jest.mock("./pages/ItemPage", () => ({
  ItemPage: () => <div>Item Page</div>,
}));

beforeEach(() => {
  resetClerkState();
  window.history.pushState({}, "", "/");
});

test("legacy home route redirects to listings", () => {
  window.history.pushState({}, "", "/home");

  render(<App />);

  expect(window.location.pathname).toBe("/listings");
});

test("signed-out users can open item pages without redirect", () => {
  window.history.pushState({}, "", "/items/item-1");

  render(<App />);

  expect(screen.getByText("Item Page")).toBeInTheDocument();
});

test("signed-out users can open profile pages without redirect", () => {
  window.history.pushState({}, "", "/profile/user-1");

  render(<App />);

  expect(screen.getByText("Profile Page")).toBeInTheDocument();
});

test("signed-out users are redirected away from create", () => {
  window.history.pushState({}, "", "/create");

  render(<App />);

  expect(window.location.pathname).toBe("/login");
});

test("signed-out users are redirected away from messages", () => {
  window.history.pushState({}, "", "/messages");

  render(<App />);

  expect(window.location.pathname).toBe("/login");
});

test("signed-in users can access protected routes", () => {
  setClerkState({
    isSignedIn: true,
    user: {
      id: "user-1",
    },
  });
  window.history.pushState({}, "", "/create");

  render(<App />);

  expect(screen.getByText("Create Listing Page")).toBeInTheDocument();
});

test("signed-in users can use the profile shortcut route", () => {
  setClerkState({
    isSignedIn: true,
    user: {
      id: "user-1",
    },
  });
  window.history.pushState({}, "", "/profile/me");

  render(<App />);

  expect(window.location.pathname).toBe("/profile/me");
  expect(screen.getByText("Profile Page")).toBeInTheDocument();
});
