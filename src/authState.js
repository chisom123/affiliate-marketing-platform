// authState.js
// Stores Firebase confirmationResult between PhoneEntryPage and VerificationPage
// Can't be passed via React Router state as it contains non-serializable functions

let confirmationResult = null;

export const setConfirmationResult = (result) => {
  confirmationResult = result;
};

export const getConfirmationResult = () => confirmationResult;

export const clearConfirmationResult = () => {
  confirmationResult = null;
};