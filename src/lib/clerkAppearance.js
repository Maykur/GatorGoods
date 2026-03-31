export const clerkAppearance = {
  variables: {
    colorPrimary: 'rgb(250 70 22)',
    colorBackground: 'rgb(15 23 42)',
    colorInputBackground: 'rgb(15 23 42)',
    colorInputText: 'rgb(248 250 252)',
    colorText: 'rgb(248 250 252)',
    colorTextSecondary: 'rgb(203 213 225)',
    colorNeutral: 'rgb(148 163 184)',
    borderRadius: '1rem',
    fontFamily: 'Manrope, system-ui, sans-serif',
  },
  elements: {
    rootBox: 'w-full',
    cardBox: 'w-full shadow-none',
    card: 'bg-transparent shadow-none',
    headerTitle: 'text-white tracking-tight',
    headerSubtitle: 'text-slate-300',
    formButtonPrimary:
      'bg-gatorOrange text-white shadow-none hover:bg-gatorOrange/90',
    formFieldLabel: 'text-app-soft',
    formFieldInput:
      'rounded-2xl border border-app-border bg-app-surface/80 text-app-text placeholder:text-app-muted',
    formFieldAction: 'text-gatorOrange hover:text-orange-300',
    footerActionLink: 'text-gatorOrange hover:text-orange-300',
    dividerLine: 'bg-white/10',
    dividerText: 'text-app-muted',
    socialButtonsBlockButton:
      'rounded-2xl border border-white/10 bg-app-surface/70 text-app-text hover:bg-app-elevated/80',
    identityPreviewText: 'text-app-soft',
    formResendCodeLink: 'text-gatorOrange hover:text-orange-300',
    otpCodeFieldInput:
      'rounded-2xl border border-app-border bg-app-surface/80 text-app-text',
    alert: 'rounded-2xl border border-white/10 bg-app-surface/70',
    alertText: 'text-app-soft',
    userButtonTrigger:
      'focus-ring rounded-full border border-white/10 bg-white/5 p-1 transition-colors hover:border-white/20 hover:bg-white/10',
    userButtonAvatarBox: 'h-11 w-11 rounded-full',
    userButtonPopoverCard:
      'overflow-hidden rounded-[1.75rem] border border-white/10 bg-app-panel/95 shadow-card backdrop-blur-xl',
    userButtonPopoverMain: 'bg-transparent',
    userButtonPopoverFooter: 'border-t border-white/10 bg-white/[0.03]',
    userPreviewMainIdentifier: 'text-white',
    userPreviewSecondaryIdentifier: 'text-app-soft',
    userButtonPopoverActionButton:
      'text-app-text transition-colors hover:bg-white/5 hover:text-white',
    userButtonPopoverActionButtonText: 'text-app-text',
    userButtonPopoverActionButtonIcon: 'text-app-soft',
  },
};
