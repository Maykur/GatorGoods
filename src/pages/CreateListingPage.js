import { useState } from 'react';
import { useUser } from '@clerk/react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  ErrorBanner,
  Input,
  PageHeader,
  Select,
  Textarea,
  useToast,
} from '../components/ui';
import { LISTING_CATEGORIES } from '../lib/viewModels';

const CONDITION_OPTIONS = ['Perfect', 'Good', 'Fair', 'Poor'];

function validateListingForm(values, userPublishingID) {
  const errors = {};

  if (!values.itemName.trim()) {
    errors.itemName = 'Item name is required.';
  }
  if (!values.itemCost.trim()) {
    errors.itemCost = 'Price is required.';
  }
  if (!values.itemCondition.trim()) {
    errors.itemCondition = 'Condition is required.';
  }
  if (!values.itemLocation.trim()) {
    errors.itemLocation = 'Pickup location is required.';
  }
  if (!values.itemPicture) {
    errors.itemPicture = 'A listing photo is required.';
  }
  if (!values.itemDescription.trim()) {
    errors.itemDescription = 'Description is required.';
  }
  if (!values.itemDetails.trim()) {
    errors.itemDetails = 'Details are required.';
  }
  if (!values.itemCat.trim()) {
    errors.itemCat = 'Category is required.';
  }
  if (!userPublishingID) {
    errors.form = "Couldn't get user details.";
  }

  return errors;
}

export function CreateListingPage() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { showToast } = useToast();
  const [values, setValues] = useState({
    itemName: '',
    itemCost: '',
    itemCondition: '',
    itemLocation: '',
    itemPicture: null,
    itemDescription: '',
    itemDetails: '',
    itemCat: '',
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  const handleChange = (field) => (event) => {
    setValues((currentValues) => ({
      ...currentValues,
      [field]: event.target.value,
    }));
    setFieldErrors((currentErrors) => ({
      ...currentErrors,
      [field]: '',
    }));
  };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) {
      return;
    }

    const fileSize = 5;
    if (file.size > fileSize * 1024 * 1024) {
      setValues((currentValues) => ({
        ...currentValues,
        itemPicture: null,
      }));
      setFieldErrors((currentErrors) => ({
        ...currentErrors,
        itemPicture: `Choose an image under ${fileSize} MB to avoid upload payload limits.`,
      }));
      setError(
        `File too big. Choose an image under ${fileSize} MB to avoid upload payload limits.`
      );
      return;
    }

    setError('');
    setFieldErrors((currentErrors) => ({
      ...currentErrors,
      itemPicture: '',
    }));
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      setValues((currentValues) => ({
        ...currentValues,
        itemPicture: reader.result,
      }));
    };
  };

  const handleOnSubmit = async (e) => {
    e.preventDefault();
    const nextFieldErrors = validateListingForm(values, userPublishingID);

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setError(nextFieldErrors.form || 'Please fix the highlighted fields and try again.');
      return;
    }

    setError('');
    setFieldErrors({});

    try {
      setIsSubmitting(true);
      const result = await fetch('http://localhost:5000/create-item', {
        method: 'POST',
        body: JSON.stringify({
          itemName: values.itemName,
          itemCost: values.itemCost,
          itemCondition: values.itemCondition,
          itemLocation: values.itemLocation,
          itemPicture: values.itemPicture,
          itemDescription: values.itemDescription,
          itemDetails: values.itemDetails,
          userPublishingID,
          userPublishingName,
          itemCat: values.itemCat,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (result.status === 413) {
        setFieldErrors((currentErrors) => ({
          ...currentErrors,
          itemPicture: 'Image upload is too large after encoding. Try a smaller image.',
        }));
        setError('Image upload is too large after encoding. Try a smaller image.');
        return;
      }

      if (!result.ok) {
        setError('Unable to create listing. Check the form and try again.');
        return;
      }

      showToast({
        title: 'Listing created',
        description: 'Your item is now live in the marketplace.',
        variant: 'success',
      });
      navigate('/listings');
    } catch (err) {
      setError('Unable to reach the server. Check your connection and retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="w-full space-y-8">
      <PageHeader
        eyebrow="Item for sale"
        title="Create a new listing"
        description="Add the basics, upload a clear photo, and publish your item into the campus marketplace without changing the current backend contract."
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]">
        <Card className="space-y-6">
          {error ? (
            <ErrorBanner title="We couldn't publish this listing" message={error} />
          ) : null}

          <form onSubmit={handleOnSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                id="item-name"
                label="Item name"
                placeholder="Desk Lamp"
                value={values.itemName}
                onChange={handleChange('itemName')}
                error={fieldErrors.itemName}
                required
              />
              <Input
                id="item-price"
                label="Price"
                type="number"
                min="0"
                step="0.01"
                placeholder="20"
                value={values.itemCost}
                onChange={handleChange('itemCost')}
                error={fieldErrors.itemCost}
                required
              />
              <Select
                id="item-condition"
                label="Condition"
                value={values.itemCondition}
                onChange={handleChange('itemCondition')}
                error={fieldErrors.itemCondition}
                required
              >
                <option value="">Select condition</option>
                {CONDITION_OPTIONS.map((condition) => (
                  <option key={condition} value={condition}>
                    {condition}
                  </option>
                ))}
              </Select>
              <Select
                id="item-category"
                label="Category"
                value={values.itemCat}
                onChange={handleChange('itemCat')}
                error={fieldErrors.itemCat}
                required
              >
                <option value="">Select category</option>
                {LISTING_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </Select>
            </div>

            <Input
              id="item-location"
              label="Pickup location"
              placeholder="Library West"
              value={values.itemLocation}
              onChange={handleChange('itemLocation')}
              error={fieldErrors.itemLocation}
              required
            />

            <div className="space-y-2">
              <label htmlFor="item-picture" className="block text-sm font-semibold text-app-text">
                Listing photo <span className="ml-1 text-gatorOrange">*</span>
              </label>
              <label
                htmlFor="item-picture"
                className="focus-ring flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[1.5rem] border border-dashed border-white/15 bg-white/5 px-5 py-10 text-center transition-colors hover:border-gatorOrange/35 hover:bg-white/10"
              >
                <span className="rounded-full border border-gatorOrange/20 bg-gatorOrange/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-gatorOrange">
                  Upload image
                </span>
                <div className="space-y-1">
                  <p className="text-base font-semibold text-white">Click to add a photo</p>
                  <p className="text-sm text-app-soft">
                    Use a sharp product image under 5 MB. Base64 upload stays unchanged for this phase.
                  </p>
                </div>
                <input
                  id="item-picture"
                  type="file"
                  accept="image/*"
                  onChange={handleFile}
                  className="sr-only"
                />
              </label>
              {fieldErrors.itemPicture ? (
                <p className="text-sm font-medium text-app-danger">{fieldErrors.itemPicture}</p>
              ) : null}
            </div>

            <Textarea
              id="item-description"
              label="Description"
              placeholder="Lamp for studying"
              value={values.itemDescription}
              onChange={handleChange('itemDescription')}
              error={fieldErrors.itemDescription}
              rows={4}
              required
            />

            <Textarea
              id="item-details"
              label="Details"
              placeholder="Warm bulb included"
              value={values.itemDetails}
              onChange={handleChange('itemDetails')}
              error={fieldErrors.itemDetails}
              rows={5}
              required
            />

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button type="submit" loading={isSubmitting}>
                {isSubmitting ? 'Publishing...' : 'Create listing'}
              </Button>
            </div>
          </form>
        </Card>

        <Card className="space-y-4 xl:sticky xl:top-28">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gatorOrange">
            Live preview
          </p>
          <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/5">
            <div className="flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-brand-blue/15 via-app-surface/85 to-gatorOrange/12">
              {values.itemPicture ? (
                <img
                  src={values.itemPicture}
                  alt="preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="px-6 text-center text-sm leading-7 text-app-muted">
                  Your listing preview appears here after you upload a photo.
                </div>
              )}
            </div>
            <div className="space-y-4 p-5">
              <div className="space-y-2">
                <p className="text-2xl font-semibold text-gatorOrange">
                  {values.itemCost ? `$${values.itemCost}` : '$0'}
                </p>
                <h2 className="text-xl font-semibold text-white">
                  {values.itemName || 'Your listing title'}
                </h2>
              </div>
              <div className="flex flex-wrap gap-2 text-sm text-app-soft">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                  {values.itemCondition || 'Condition'}
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                  {values.itemCat || 'Category'}
                </span>
              </div>
              <p className="text-sm text-app-soft">
                {values.itemLocation || 'Pickup location appears here'}
              </p>
              <p className="text-sm leading-7 text-app-soft">
                {values.itemDescription || 'A short description helps buyers understand the item quickly.'}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}
