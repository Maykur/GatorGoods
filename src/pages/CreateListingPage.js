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
  const [itemCat, setItemCat] = useState('');
  const [error, setError] = useState('');
  const userPublishingID = user?.id;
  const fallbackEmail =
    user?.primaryEmailAddress?.emailAddress ||
    user?.emailAddresses?.[0]?.emailAddress ||
    '';
  const fallbackName = fallbackEmail ? fallbackEmail.split('@')[0] : '';
  const userPublishingName =
    user?.fullName ||
    user?.firstName ||
    user?.username ||
    fallbackName ||
    'GatorGoods User';

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) {
      return;
    }

    const fileSize = 5;
    if (file.size > fileSize * 1024 * 1024) {
      setItemPicture(null);
      setError(
        `File too big. Choose an image under ${fileSize} MB to avoid upload payload limits.`
      );
      return;
    }

    setError('');
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
    if (!userPublishingID) {
      setError("Couldn't get user details");
      return;
    }
    if (!itemCat.trim()) {
      setError('Item Category Required');
      return;
    }
    setError('');

    try {
      const result = await fetch('http://localhost:5000/create-item', {
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
          itemCat,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (result.status === 413) {
        setError('Image upload is too large after encoding. Try a smaller image.');
        return;
      }

      if (!result.ok) {
        setError('Unable to create listing. Check the form and try again.');
        return;
      }

      alert('Item Created');
      setItemName('');
      setItemCost('');
      setItemCondition('');
      setItemLocation('');
      setItemPicture(null);
      setItemDescription('');
      setItemDetails('');
      setItemCat('');
      navigate('/');
    } catch (err) {
      setError('Unable to reach the server. Check your connection and retry.');
    }
  };

  return (
    <main>
      <h1 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-gatorOrange">Item For Sale</h1>
      <div style={{display: "flex", gap: "40px", alignItems: "flex-start"}}>
      <form
        onSubmit={handleOnSubmit}
        style={{ display: 'flex', flexDirection: 'Column', gap: '10px', maxWidth: '400px' }}
      >
        <div className="rounded-3xl border border-slate-800 bg-gatorShade/60 px-6 py-1 shadow-lg shadow-black/20 ">
          <label>Name: </label>
          <input
            type="text" 
            placeholder="Item Name"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            className="bg-gatorShade rounded-3xl px-2 py-1"
            style={{color: 'white'}}
          />
        </div>
        <div className="rounded-3xl border border-slate-800 bg-gatorShade/60 px-6 py-1 shadow-lg shadow-black/20 ">
          <label>Price: </label>
          <input
            type="number"
            placeholder="Item Price (USD)"
            value={itemCost}
            onChange={(e) => setItemCost(e.target.value)}
            className="bg-gatorShade rounded-3xl px-2 py-1"
            style={{color: 'white'}}
          />
        </div>
        <div className="rounded-3xl border border-slate-800 bg-gatorShade/60 px-6 py-1 shadow-lg shadow-black/20 ">
          <label>Condition: </label>
          <select
            value={itemCondition}
            onChange={(e) => setItemCondition(e.target.value)}
            className="bg-gatorShade rounded-3xl px-2 py-1"
            style={{color: 'white'}}
          >
            <option value="">Select Item Condition</option>
            <option value="Perfect">Perfect</option>
            <option value="Good">Good</option>
            <option value="Fair">Fair</option>
            <option value="Poor">Poor</option>
          </select>
        </div>
        <div className="rounded-3xl border border-slate-800 bg-gatorShade/60 px-6 py-1 shadow-lg shadow-black/20 ">
          <label>Location: </label>
          <input
            type="text"
            placeholder="Item Location"
            value={itemLocation}
            onChange={(e) => setItemLocation(e.target.value)}
            className="bg-gatorShade rounded-3xl px-2 py-1"
            style={{color: 'white'}}
          />
        </div>
        <div className="rounded-3xl border border-slate-800 bg-gatorShade/60 px-6 py-1 shadow-lg shadow-black/20 ">
          <label>Image: </label>
          <input
            type="file"
            accept="image/*"
            placeholder="Image URL"
            onChange={handleFile}
            className="bg-gatorShade rounded-3xl px-2 py-1"
            style={{color: 'white'}}
          />
        </div>
        <div className="rounded-3xl border border-slate-800 bg-gatorShade/60 px-6 py-1 shadow-lg shadow-black/20 ">
          <label>Description: </label>
          <input
            type="text"
            placeholder="Item Description"
            value={itemDescription}
            onChange={(e) => setItemDescription(e.target.value)}
            className="bg-gatorShade rounded-3xl px-2 py-1"
            style={{color: 'white'}}
          />
        </div>
        <div className="rounded-3xl border border-slate-800 bg-gatorShade/60 px-6 py-1 shadow-lg shadow-black/20 ">
          <label>Details: </label>
          <input
            type="text"
            placeholder="Item Details"
            value={itemDetails}
            onChange={(e) => setItemDetails(e.target.value)}
            className="bg-gatorShade rounded-3xl px-2 py-1"
            style={{color: 'white'}}
          />
        </div>
        <div className="rounded-3xl border border-slate-800 bg-gatorShade/60 px-6 py-1 shadow-lg shadow-black/20 ">
					<label className="mb-2">Category: </label>
					<select
						value={itemCat}
						onChange={(e) => setItemCat(e.target.value)}
						className="bg-gatorShade rounded-xl py-1 px-2 focus:ring-2 focus:ring-gatorOrange"
            style={{color:'white'}}>
						<option value="">Select Category</option>
						<option value="Vehicles">Vehicles</option>
						<option value="Property Rentals">Property Rentals</option>
						<option value="Apparel & Accessories">Apparel & Accessories</option>
						<option value="Electronics & Computers">Electronics & Computers</option>
						<option value="Home & Garden">Home & Garden</option>
						<option value="Entertainment & Hobbies">Entertainment & Hobbies</option>
            <option value="Family">Family</option>
						<option value="Miscellaneous">Miscellaneous</option>
					</select>
				</div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button
          className="bg-gatorBlue hover:bg-gatorOrange/80 transition-color"
          type="submit"
          style={{
            color: 'white',
            padding: '10px',
            border: 'none',
            borderRadius: '5px',
            fontWeight: 'bold',
          }}
              >
        
        <h1 className=" text-sm font-semibold uppercase tracking-[0.2em] ">Create Listing</h1>
              </button>
          </form>
          <div style={{ height: '6px' }}></div>
        <div>
          <h1 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-gatorOrange">Item Picture Preview:</h1>
          {itemPicture && (
            <img
              src={itemPicture}
              alt="preview"
              style={{ width: '200px', height: 'auto' }}
            />
          )}
        </div>
      </div>
    </main>
  );
}
