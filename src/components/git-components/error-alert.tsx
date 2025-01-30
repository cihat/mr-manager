import { Alert, AlertDescription } from "../ui/alert";

export const ErrorAlert: React.FC<{ message?: string }> = ({ message }) => (
  message ? (
    <Alert variant="destructive">
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  ) : null
);
