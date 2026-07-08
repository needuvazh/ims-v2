export class OtpService {
  private readonly otpStore = new Map<
    string,
    { code: string; expiresAt: number }
  >();

  async generateOtp(personId: string): Promise<string> {
    // Generate a secure 6-digit random code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes validity
    this.otpStore.set(personId, { code, expiresAt });

    // In ASTI production context, this triggers notification logs via Outbox / SMS gateway
    console.log(`[OTP SYSTEM] Code for Person ${personId} generated: ${code}`);
    return code;
  }

  async verifyOtp(personId: string, inputCode: string): Promise<boolean> {
    const entry = this.otpStore.get(personId);
    if (!entry) {
      return false;
    }

    if (Date.now() > entry.expiresAt) {
      this.otpStore.delete(personId);
      return false;
    }

    const isValid = entry.code === inputCode;
    if (isValid) {
      this.otpStore.delete(personId); // Consume code on successful verification
    }

    return isValid;
  }
}
