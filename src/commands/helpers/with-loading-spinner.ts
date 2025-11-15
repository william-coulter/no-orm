import { createSpinner } from "nanospinner";

/** Perform `action` with a loading spinner that the user can see. */
export async function withLoadingSpinner({
  action,
  spinnerText,
  successMessage,
  failureMessage,
}: Args): Promise<void> {
  const spinner = createSpinner(spinnerText);

  try {
    spinner.start();
    await action();
    spinner.success(successMessage);
  } catch (e) {
    spinner.error(failureMessage ? `${failureMessage}: ${e}` : undefined);
  }
}

type Args = {
  action: () => Promise<any>;
  spinnerText?: string;
  successMessage?: string;
  failureMessage?: string;
};
