const defaultClerkState = {
  isLoaded: true,
  isSignedIn: false,
  user: null,
};

let clerkState = {...defaultClerkState};

export function getClerkState() {
  return clerkState;
}

export function resetClerkState() {
  clerkState = {...defaultClerkState};
}

export function setClerkState(overrides = {}) {
  clerkState = {
    ...defaultClerkState,
    ...overrides,
  };

  if (typeof overrides.isSignedIn === "undefined") {
    clerkState.isSignedIn = Boolean(clerkState.user);
  }
}
