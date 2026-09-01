import { assertSmtpConfiguration } from "../_core/runtimeConfig";
import { sendSchedulerDeadManAlert } from "../emailService";

const recipient = "adeyadewuyi@gmail.com";

async function main() {
  if (process.env.ALLOW_DEAD_MAN_TEST_ALERT !== "true") {
    throw new Error("Dead-man TEST alert is disabled. Set ALLOW_DEAD_MAN_TEST_ALERT=true for an approved one-time test.");
  }

  assertSmtpConfiguration();

  const now = new Date();
  const sent = await sendSchedulerDeadManAlert({
    recipient,
    jobName: "TEST — Field Scheduler dead-man alert",
    expectedRunAt: now,
    lastRunAt: now,
    lastStatus: "TEST",
    schedulerState: "armed",
  });

  if (!sent) {
    throw new Error("Dead-man TEST alert delivery failed");
  }

  console.log(`Dead-man TEST alert sent to ${recipient} at ${now.toISOString()}`);
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
