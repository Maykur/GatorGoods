// REFERENCES: https://stackoverflow.com/questions/70203488/how-can-i-fetch-data-from-mongodb-and-display-it-on-react-front-end
// https://clerk.com/docs/nextjs/guides/users/reading

import { useEffect } from 'react';
import { useUser } from '@clerk/react'
import axios from 'axios';

// Purely to save logins/profile info from Clerk into our DB
export function UserProfile() {
    const { user } = useUser();
    useEffect(() => {
        if (!user) { 
            return;
        }
        const primaryEmail =
          user.primaryEmailAddress?.emailAddress ||
          user.emailAddresses?.[0]?.emailAddress ||
          '';
        const fallbackName = primaryEmail ? primaryEmail.split('@')[0] : 'GatorGoods User';
        axios.post('http://localhost:5000/user', {
            profileName: user.fullName || user.firstName || user.username || fallbackName,
            profilePicture: user.imageUrl,
            profileID: user.id,
            ufVerified: primaryEmail.endsWith('@ufl.edu'),
        }).catch((e) => {
            console.error('User DB fail: ', e);
        });
    }, [user]);
    return null;
}
