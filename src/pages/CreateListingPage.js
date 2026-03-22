// REFERENCES: https://stackoverflow.com/questions/47176280/how-to-convert-files-to-base64-in-react
// https://clerk.com/docs/nextjs/guides/users/reading

import { useState } from 'react';
import { useUser } from '@clerk/react';
import { useNavigate } from 'react-router-dom';

export function CreateListingPage() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [itemName, setItemName] = useState('');
  const [itemCost, setItemCost] = useState('');
  const [itemCondition, setItemCondition] = useState('');
  const [itemLocation, setItemLocation] = useState('');
  const [itemPicture, setItemPicture] = useState(null);
  const [itemDescription, setItemDescription] = useState('');
  const [itemDetails, setItemDetails] = useState('');
  const [error, setError] = useState('');
  const userPublishingID = user?.id;
  const userPublishingName = user?.fullName || user?.firstName || '';
  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) {
      return;
    }
    const fileSize = 5;
    if (file.size > fileSize * 1024 * 1024) {
      alert(`File too big! Max size is ${fileSize} MB.`);
      return;
    }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      setItemPicture(reader.result);
    };
  };
  const handleOnSubmit = async (e) => {
    e.preventDefault();
    if (!itemName.trim()) {
      setError('Item Name Required');
      return;
    }
    if (!itemCost.trim()) {
      setError('Item Price Required');
      return;
    }
    if (!itemCondition.trim()) {
      setError('Item Condition Required');
      return;
    }
    if (!itemLocation.trim()) {
      setError('Item Location Required');
      return;
    }
    if (!itemPicture) {
      setError('Item Picture Required');
      return;
    }
    if (!itemDescription.trim()) {
      setError('Item Description Required');
      return;
    }
    if (!itemDetails.trim()) {
      setError('Item Details Required');
      return;
    }
    if (!userPublishingID || !userPublishingName) {
      setError("Couldn't get user details");
      return;
    }
    setError('');
    let result = await fetch('http://localhost:5000/create-item', {
      method: 'POST',
      body: JSON.stringify({
        itemName,
        itemCost,
        itemCondition,
        itemLocation,
        itemPicture,
        itemDescription,
        itemDetails,
        userPublishingID,
        userPublishingName,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (!result.ok) {
      setError('Invalid Listing');
      return;
    }
    alert('Item Created');
    setItemName('');
    setItemCost('');
    setItemCondition('');
    setItemLocation('');
    setItemPicture('');
    setItemDescription('');
    setItemDetails('');
    navigate('/offers');
  };
  return (
    <main>
      <h1>Create Listing</h1>
      <form
        onSubmit={handleOnSubmit}
        style={{ display: 'flex', flexDirection: 'Column', gap: '10px', maxWidth: '400px' }}
      >
        <div>
          <label>Item Name: </label>
          <input
            type="text"
            placeholder="Item Name"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            style={{ color: 'black', backgroundColor: 'white' }}
          />
        </div>
        <div>
          <label>Item Price: </label>
          <input
            type="number"
            placeholder="Price"
            value={itemCost}
            onChange={(e) => setItemCost(e.target.value)}
            style={{ color: 'black', backgroundColor: 'white' }}
          />
        </div>
        <div>
          <label>Item Condition: </label>
          <select
            value={itemCondition}
            onChange={(e) => setItemCondition(e.target.value)}
            style={{ color: 'black', backgroundColor: 'white' }}
          >
            <option value="">Select Condition</option>
            <option value="Perfect">Perfect</option>
            <option value="Good">Good</option>
            <option value="Fair">Fair</option>
            <option value="Poor">Poor</option>
          </select>
        </div>
        <div>
          <label>Item Location: </label>
          <input
            type="text"
            placeholder="Location"
            value={itemLocation}
            onChange={(e) => setItemLocation(e.target.value)}
            style={{ color: 'black', backgroundColor: 'white' }}
          />
        </div>
        <div>
          <label>Item Picture: </label>
          <input
            type="file"
            accept="image/*"
            placeholder="Image URL"
            onChange={handleFile}
            style={{ color: 'black', backgroundColor: 'white' }}
          />
        </div>
        <div>
          <label>Item Description: </label>
          <input
            type="text"
            placeholder="Description"
            value={itemDescription}
            onChange={(e) => setItemDescription(e.target.value)}
            style={{ color: 'black', backgroundColor: 'white' }}
          />
        </div>
        <div>
          <label>Item Details: </label>
          <input
            type="text"
            placeholder="Details"
            value={itemDetails}
            onChange={(e) => setItemDetails(e.target.value)}
            style={{ color: 'black', backgroundColor: 'white' }}
          />
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button
          type="submit"
          style={{
            backgroundColor: 'grey',
            color: 'white',
            padding: '10px',
            border: 'none',
            borderRadius: '5px',
            fontWeight: 'bold',
          }}
        >
          Create Listing
        </button>
      </form>
      <label>Item Picture Preview:</label>
      {itemPicture && (
        <img
          src={itemPicture}
          alt="preview"
          style={{ width: '200px', height: 'auto' }}
        />
      )}
    </main>
  );
}
