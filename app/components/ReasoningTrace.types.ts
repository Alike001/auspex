 export type StepStatus = "pending" | "inProgress" | "success" | "error";

  export type StepTone = "success" | "info" | "accent" | "danger" | "muted";

  type StepBase = {
    label: string;
    detail?: string;
  };

  export type Step =
    | (StepBase & { status: "pending" })
    | (StepBase & { status: "inProgress" })
    | (StepBase & { status: "success"; tone?: StepTone; txHash?: string })
    | (StepBase & { status: "error"; error: string });
