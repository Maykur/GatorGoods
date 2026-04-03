import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ProfilePage } from './ProfilePage';
import { resetClerkState, setClerkState } from '../testUtils/mockClerk';

const mockShowToast = jest.fn();
const mockConfirm = jest.fn(() => Promise.resolve(true));
let mockRouteParams = { id: 'seller-1' };

jest.mock('@clerk/react', () => {
  const { getClerkState } = require('../testUtils/mockClerk');

  return {
    useUser: () => getClerkState(),
  };
});

jest.mock('../components/ui', () => {
  const actual = jest.requireActual('../components/ui');

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
  'react-router-dom',
  () => {
    const React = require('react');

    return {
      Link: ({ children, to, ...props }) => React.createElement('a', { href: to, ...props }, children),
      useParams: () => mockRouteParams,
    };
  },
  { virtual: true }
);

function jsonResponse(body, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

function buildProfileResponse() {
  return {
    profile: {
      profileID: 'seller-1',
      profileName: 'Seller One',
      profilePicture: '',
      profileBanner: 'https://example.com/banner.png',
      profileBio: 'Selling a few trusted dorm essentials.',
      instagramUrl: 'https://instagram.com/sellerone',
      linkedinUrl: 'https://linkedin.com/in/sellerone',
      profileRating: 4.5,
      profileTotalRating: 9,
      ufVerified: true,
      profileFavorites: ['item-2'],
      trustMetrics: {
        reliability: 92,
        accuracy: 88,
        responsiveness: 100,
        safety: 81,
      },
    },
    listings: [
      {
        _id: 'item-1',
        itemName: 'Desk Lamp',
        itemCost: '20',
        itemCondition: 'Good',
        itemLocation: 'Library West',
        itemPicture: 'lamp.png',
        itemCat: 'Electronics & Computers',
        userPublishingName: 'Seller One',
        status: 'active',
      },
    ],
  };
}

function buildSignedInUser(id = 'seller-1') {
  return {
    id,
    setProfileImage: jest.fn(async ({ file }) => ({
      publicUrl: typeof file === 'string' ? file : '',
    })),
    reload: jest.fn(async () => {}),
  };
}

beforeEach(() => {
  resetClerkState();
  mockShowToast.mockReset();
  mockConfirm.mockReset();
  mockConfirm.mockResolvedValue(true);
  mockRouteParams = { id: 'seller-1' };
  global.FileReader = class MockFileReader {
    readAsDataURL(file) {
      this.result = `data:${file.type};base64,mock-banner-data`;
      if (typeof this.onloadend === 'function') {
        this.onloadend();
      }
    }
  };

  global.fetch = jest.fn((url, options = {}) => {
    if (url === 'http://localhost:5000/profile/seller-1') {
      return jsonResponse(buildProfileResponse());
    }

    if (url === 'http://localhost:5000/items/item-2') {
      return jsonResponse({
        _id: 'item-2',
        itemName: 'Mini Fridge',
        itemCost: '80',
        itemCondition: 'Fair',
        itemLocation: 'Broward Hall',
        itemPicture: 'fridge.png',
        itemCat: 'Home & Garden',
        userPublishingID: 'seller-2',
        userPublishingName: 'Seller Two',
        status: 'active',
      });
    }

    if (url === 'http://localhost:5000/update_score/seller-1' && options.method === 'POST') {
      return jsonResponse({
        ...buildProfileResponse().profile,
        profileRating: 4.7,
      });
    }

    if (url === 'http://localhost:5000/user/seller-1' && options.method === 'PATCH') {
      return jsonResponse({
        ...buildProfileResponse().profile,
        profileName: 'Updated Seller',
        profileBio: 'Updated bio',
      });
    }

    if (url === 'http://localhost:5000/user/seller-1/fav/item-2' && options.method === 'DELETE') {
      return jsonResponse({ profileFavorites: [] });
    }

    throw new Error(`Unhandled fetch request: ${url}`);
  });
});

afterEach(() => {
  delete global.fetch;
  delete global.FileReader;
});

test('signed-out users can view a public seller profile with trust metrics and connectors', async () => {
  render(<ProfilePage />);

  expect((await screen.findAllByText('Seller One')).length).toBeGreaterThan(0);
  expect(screen.getByText('UF verified')).toBeInTheDocument();
  expect(screen.getByText('92%')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /instagram/i })).toHaveAttribute(
    'href',
    'https://instagram.com/sellerone'
  );
  expect(screen.getByRole('link', { name: /linkedin/i })).toHaveAttribute(
    'href',
    'https://linkedin.com/in/sellerone'
  );
  expect(screen.getByText('Desk Lamp')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /save profile changes/i })).not.toBeInTheDocument();
});

test('signed-in owners see their listings dashboard, edit form, and favorites shortcut', async () => {
  setClerkState({
    isSignedIn: true,
    user: buildSignedInUser(),
  });

  render(<ProfilePage ownerView />);

  fireEvent.click(await screen.findByRole('button', { name: /edit profile/i }));
  expect(await screen.findByText(/refresh what people see before they message you/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/short bio/i)).toHaveValue('Selling a few trusted dorm essentials.');
  expect(screen.getByLabelText(/display name/i)).toHaveValue('Seller One');
  expect(screen.getByLabelText(/profile photo url/i)).toHaveValue('');
  expect(screen.getByRole('link', { name: /open favorites/i })).toHaveAttribute('href', '/favorites');
  expect(screen.getByText(/manage what you currently have posted/i)).toBeInTheDocument();
});

test('signed-in owners can save lightweight public profile edits', async () => {
  const signedInUser = buildSignedInUser();
  setClerkState({
    isSignedIn: true,
    user: signedInUser,
  });

  render(<ProfilePage ownerView />);

  fireEvent.click(await screen.findByRole('button', { name: /edit profile/i }));
  fireEvent.change(screen.getByLabelText(/display name/i), {
    target: { value: 'Updated Seller' },
  });
  fireEvent.change(screen.getByLabelText(/profile photo url/i), {
    target: { value: 'https://example.com/avatar.png' },
  });
  fireEvent.change(screen.getByLabelText(/short bio/i), {
    target: { value: 'Updated bio' },
  });
  fireEvent.change(screen.getByLabelText(/banner image url/i), {
    target: { value: 'https://example.com/updated-banner.png' },
  });
  fireEvent.click(screen.getByRole('button', { name: /save profile changes/i }));

  await waitFor(() => {
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:5000/user/seller-1',
      expect.objectContaining({
        method: 'PATCH',
      })
    );
  });
  const patchCall = global.fetch.mock.calls.find(([url]) => url === 'http://localhost:5000/user/seller-1');
  expect(JSON.parse(patchCall[1].body)).toEqual(
    expect.objectContaining({
      profileName: 'Updated Seller',
      profilePicture: 'https://example.com/avatar.png',
      profileBio: 'Updated bio',
      profileBanner: 'https://example.com/updated-banner.png',
    })
  );
  expect(signedInUser.setProfileImage).toHaveBeenCalledWith({
    file: 'https://example.com/avatar.png',
  });

  expect(mockShowToast).toHaveBeenCalledWith(
    expect.objectContaining({
      title: 'Profile updated',
      variant: 'success',
    })
  );
});

test('signed-in owners can upload a banner image from the edit form', async () => {
  setClerkState({
    isSignedIn: true,
    user: buildSignedInUser(),
  });

  render(<ProfilePage ownerView />);

  fireEvent.click(await screen.findByRole('button', { name: /edit profile/i }));
  const file = new File(['banner'], 'banner.png', { type: 'image/png' });
  fireEvent.change(screen.getByLabelText(/upload banner image/i), {
    target: { files: [file] },
  });
  await waitFor(() => {
    expect(screen.getByLabelText(/banner image url/i)).toHaveValue('data:image/png;base64,mock-banner-data');
  });
  fireEvent.click(screen.getByRole('button', { name: /save profile changes/i }));

  await waitFor(() => {
    const patchCall = global.fetch.mock.calls.find(([url]) => url === 'http://localhost:5000/user/seller-1');
    expect(JSON.parse(patchCall[1].body)).toEqual(
      expect.objectContaining({
        profileBanner: 'data:image/png;base64,mock-banner-data',
      })
    );
  });
});

test('signed-in owners can upload a profile picture from the edit form', async () => {
  const signedInUser = buildSignedInUser();
  setClerkState({
    isSignedIn: true,
    user: signedInUser,
  });

  render(<ProfilePage ownerView />);

  fireEvent.click(await screen.findByRole('button', { name: /edit profile/i }));
  const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });
  fireEvent.change(screen.getByLabelText(/upload profile photo/i), {
    target: { files: [file] },
  });
  await waitFor(() => {
    expect(screen.getByLabelText(/profile photo url/i)).toHaveValue('data:image/png;base64,mock-banner-data');
  });
  fireEvent.click(screen.getByRole('button', { name: /save profile changes/i }));

  await waitFor(() => {
    const patchCall = global.fetch.mock.calls.find(([url]) => url === 'http://localhost:5000/user/seller-1');
    expect(JSON.parse(patchCall[1].body)).toEqual(
      expect.objectContaining({
        profilePicture: 'data:image/png;base64,mock-banner-data',
      })
    );
  });
  expect(signedInUser.setProfileImage).toHaveBeenCalledWith({
    file: 'data:image/png;base64,mock-banner-data',
  });
});

test('signed-in non-owners can submit a seller review', async () => {
  setClerkState({
    isSignedIn: true,
    user: {
      id: 'buyer-1',
    },
  });

  render(<ProfilePage />);

  fireEvent.change(await screen.findByLabelText(/review rating/i), {
    target: { value: '5' },
  });
  fireEvent.click(screen.getByRole('button', { name: /submit review score/i }));

  await waitFor(() => {
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:5000/update_score/seller-1',
      expect.objectContaining({
        method: 'POST',
      })
    );
  });
  expect(mockShowToast).toHaveBeenCalledWith(
    expect.objectContaining({
      title: 'Review submitted',
      variant: 'success',
    })
  );
});
