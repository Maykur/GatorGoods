import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useUser } from '@clerk/react';
import { getTransactionByOfferId, submitTransactionReview } from '../lib/transactionsApi';
import { toTransactionViewModel } from '../lib/viewModels';
import {
  AppIcon,
  Button,
  Card,
  ErrorBanner,
  PageHeader,
  Skeleton,
  Textarea,
  useToast,
} from '../components/ui';

const API_BASE_URL = 'http://localhost:5000';
const SCORE_OPTIONS = ['1', '2', '3', '4', '5'];

function getRequestedDecision() {
  if (typeof window === 'undefined') {
    return '';
  }

  const decision = new URLSearchParams(window.location.search).get('decision');
  return decision === 'confirmed' || decision === 'problemReported' ? decision : '';
}

function ReviewSkeleton() {
  return (
    <div className="space-y-4">
      <Card className="space-y-4">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-5 w-full max-w-xl" />
        <Skeleton className="h-28 rounded-[1.5rem]" />
      </Card>
    </div>
  );
}

async function fetchOptionalJson(url) {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch {
    return null;
  }
}

function buildInitialAnswers(isSeller) {
  return {
    reliability: '',
    accuracy: isSeller ? undefined : '',
    responsiveness: '',
    safety: '',
    details: '',
  };
}

function getQuestionCopy({isSeller, decision}) {
  const subjectLabel = isSeller ? 'buyer' : 'seller';
  const flowLabel =
    decision === 'problemReported'
      ? `Tell us what went wrong with this ${subjectLabel}.`
      : `Share how the handoff went with this ${subjectLabel}.`;

  return {
    title: decision === 'problemReported' ? 'Report transaction issue' : 'Leave transaction feedback',
    description: flowLabel,
    detailsLabel: decision === 'problemReported' ? 'What happened?' : 'Anything else to share?',
    detailsHint:
      decision === 'problemReported'
        ? 'Required for problem reports so both sides have a clear record.'
        : 'Optional, but helpful if you want to leave a little more context.',
  };
}

function ScoreButtonGroup({ id, label, icon, value, onChange, required = false }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-white">
        <AppIcon icon={icon} className="text-app-muted" />
        <label htmlFor={id} className="cursor-default">
          {label}
          {required ? <span className="ml-1 text-gatorOrange">*</span> : null}
        </label>
      </div>
      <div id={id} className="flex flex-wrap gap-2" role="group" aria-label={label}>
        {SCORE_OPTIONS.map((score) => {
          const isSelected = value === score;

          return (
            <button
              key={score}
              type="button"
              aria-pressed={isSelected}
              aria-label={`${label} score ${score}`}
              onClick={() => onChange({ target: { value: score } })}
              className={`focus-ring flex h-12 w-12 items-center justify-center rounded-full border text-sm font-semibold transition ${
                isSelected
                  ? 'border-gatorOrange bg-gatorOrange text-white shadow-[0_10px_24px_rgba(250,112,10,0.24)]'
                  : 'border-white/10 bg-white/5 text-app-soft hover:border-white/20 hover:text-white'
              }`}
            >
              {score}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function TransactionReviewPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user, isLoaded } = useUser();
  const { showToast } = useToast();
  const [transaction, setTransaction] = useState(null);
  const [answers, setAnswers] = useState(buildInitialAnswers(false));
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const decision = getRequestedDecision();

  const loadTransaction = useCallback(async () => {
    if (!orderId) {
      setError('No order ID provided.');
      setIsLoading(false);
      return;
    }

    if (!isLoaded) {
      return;
    }

    if (!user?.id) {
      setError('Sign in to review this transaction.');
      setIsLoading(false);
      return;
    }

    if (!decision) {
      setError('Review flow not found.');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      const rawTransaction = await getTransactionByOfferId(orderId, {
        participantId: user.id,
      });
      const listingId = rawTransaction.listingId?.toString?.() || rawTransaction.listingId || '';
      const counterpartId =
        user.id === rawTransaction.sellerClerkUserId
          ? rawTransaction.buyerClerkUserId
          : rawTransaction.sellerClerkUserId;
      const [listingData, profileData] = await Promise.all([
        listingId ? fetchOptionalJson(`${API_BASE_URL}/items/${listingId}`) : null,
        counterpartId ? fetchOptionalJson(`${API_BASE_URL}/profile/${counterpartId}`) : null,
      ]);
      const isSeller = user.id === rawTransaction.sellerClerkUserId;
      const transactionView = toTransactionViewModel(rawTransaction, {
        listing: listingData,
        buyerProfile: isSeller ? profileData : null,
        sellerProfile: !isSeller ? profileData : null,
      });

      setTransaction(transactionView);
      setAnswers(buildInitialAnswers(isSeller));
    } catch (loadError) {
      setError(loadError.message || 'Failed to load transaction review.');
    } finally {
      setIsLoading(false);
    }
  }, [decision, isLoaded, orderId, user?.id]);

  useEffect(() => {
    loadTransaction();
  }, [loadTransaction]);

  const isSeller = Boolean(user?.id && transaction?.sellerId === user.id);
  const reviewCopy = useMemo(() => getQuestionCopy({isSeller, decision}), [decision, isSeller]);
  const counterpartLabel = isSeller ? 'Buyer' : 'Seller';
  const counterpartName = isSeller ? transaction?.buyerName : transaction?.sellerName;
  const alreadyReviewed = isSeller ? Boolean(transaction?.sellerReviewedAt) : Boolean(transaction?.buyerReviewedAt);

  const handleAnswerChange = (field) => (event) => {
    setAnswers((currentAnswers) => ({
      ...currentAnswers,
      [field]: event.target.value,
    }));
    setFieldError('');
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!transaction?.transactionId || !user?.id) {
      return;
    }

    const requiredFields = isSeller
      ? ['reliability', 'responsiveness', 'safety']
      : ['reliability', 'accuracy', 'responsiveness', 'safety'];
    const missingField = requiredFields.find((field) => !String(answers[field] || '').trim());

    if (missingField) {
      setFieldError('Answer every required question before submitting.');
      return;
    }

    if (decision === 'problemReported' && String(answers.details || '').trim().length < 8) {
      setFieldError('Add a short description of what went wrong before submitting.');
      return;
    }

    try {
      setIsSubmitting(true);
      await submitTransactionReview(transaction.transactionId, {
        requesterClerkUserId: user.id,
        decision,
        answers: {
          reliability: Number(answers.reliability),
          ...(isSeller ? {} : {accuracy: Number(answers.accuracy)}),
          responsiveness: Number(answers.responsiveness),
          safety: Number(answers.safety),
          details: String(answers.details || '').trim(),
        },
      });

      showToast({
        title: decision === 'problemReported' ? 'Issue recorded' : 'Feedback submitted',
        description: decision === 'problemReported'
          ? 'Your report has been saved to this transaction.'
          : 'Your confirmation and feedback are now saved to this transaction.',
        variant: 'success',
      });
      navigate(`/transact/${orderId}`);
    } catch (submitError) {
      setError(submitError.message || 'Failed to submit transaction review.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="w-full space-y-8 motion-safe:animate-fade-in-up">
      <PageHeader
        eyebrow="Transaction Review"
        icon="verified"
        title={reviewCopy.title}
        description={reviewCopy.description}
        actions={
          <Link to={`/transact/${orderId}`} className="no-underline">
            <Button variant="ghost" size="sm" leadingIcon="back">
              Back to transaction
            </Button>
          </Link>
        }
      />

      {error ? (
        <ErrorBanner
          title="We couldn't open this review"
          message={`${error} Refresh and try again in a moment.`}
        />
      ) : null}

      {isLoading ? <ReviewSkeleton /> : null}

      {!isLoading && !error && transaction ? (
        <div className="space-y-6">
          <Card className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-app-muted">Transaction summary</p>
              <h2 className="text-2xl font-semibold text-white">{transaction.listingTitle}</h2>
              <p className="text-sm leading-7 text-app-soft">
                {counterpartLabel}: {counterpartName} • {transaction.offeredPriceLabel} • {transaction.meetupScheduleLabel}
              </p>
            </div>
          </Card>

          {alreadyReviewed ? (
            <Card className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">Review already submitted</h2>
              <p className="text-sm leading-7 text-app-soft">
                You have already submitted your transaction review for this handoff.
              </p>
            </Card>
          ) : (
            <Card className="space-y-5">
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="grid gap-6 md:grid-cols-2">
                  <ScoreButtonGroup
                    id="review-reliability"
                    label="Reliability"
                    icon="reliability"
                    value={answers.reliability}
                    onChange={handleAnswerChange('reliability')}
                    required
                  />

                  {!isSeller ? (
                    <ScoreButtonGroup
                      id="review-accuracy"
                      label="Listing accuracy"
                      icon="accuracy"
                      value={answers.accuracy}
                      onChange={handleAnswerChange('accuracy')}
                      required
                    />
                  ) : null}

                  <ScoreButtonGroup
                    id="review-responsiveness"
                    label="Responsiveness"
                    icon="responsiveness"
                    value={answers.responsiveness}
                    onChange={handleAnswerChange('responsiveness')}
                    required
                  />

                  <ScoreButtonGroup
                    id="review-safety"
                    label="Safety"
                    icon="safety"
                    value={answers.safety}
                    onChange={handleAnswerChange('safety')}
                    required
                  />
                </div>

                <div className="text-left">
                  <Textarea
                    id="review-details"
                    label={reviewCopy.detailsLabel}
                    leadingIcon="messages"
                    rows={4}
                    value={answers.details}
                    onChange={handleAnswerChange('details')}
                    error={fieldError}
                    hint={reviewCopy.detailsHint}
                    placeholder={
                      decision === 'problemReported'
                        ? 'Describe what went wrong so the outcome is clear.'
                        : 'Optional context about the handoff.'
                    }
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button type="submit" leadingIcon="verified" loading={isSubmitting}>
                    Submit transaction review
                  </Button>
                  <Link to={`/transact/${orderId}`} className="no-underline">
                    <Button type="button" variant="ghost">
                      I clicked the wrong button
                    </Button>
                  </Link>
                </div>
              </form>
            </Card>
          )}
        </div>
      ) : null}
    </section>
  );
}
