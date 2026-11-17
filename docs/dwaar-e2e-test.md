# Dwaar: two-account test (about 30 minutes)

Do this once on your own computer before launch. You use two real Google accounts (called **A = employee** and **B = candidate**) in two browser profiles, or one normal window and one private window. Real emails are sent to real inboxes in this test, so use accounts whose inboxes you can open. Tick each line as it works. If a line fails, write down what you saw and tell Claude.

## 0. Get ready

1. Run `supabase db push --remote` (applies migrations 11 to 29). Then run `supabase gen types typescript --remote > types/database.ts`.
2. In `.env.local` make sure these are set: the Supabase URL and anon key, `DWAAR_SERVER_SECRET` (the same secret whose SHA-256 is in `private.dwaar_config`), `GEMINI_API_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, and the two Razorpay **test** keys (`rzp_test_...`).
3. For the money and invite steps (sections 5 to 7) also set `DWAAR_INVITES_ENABLED=true` and `DWAAR_PLAN_ENABLED=true`. In the Supabase SQL editor run `update private.dwaar_config set value = 'true' where key = 'invite_rewards_enabled';`. Leave `DWAAR_BOOST_ENABLED` unset for now (section 6 turns it on).
4. Account A must be a real employee. Make sure A's company exists in the admin panel with its email domain (for example Accenture with `accenture.com`), and that you can open A's work inbox at that domain. (Free mail such as Gmail cannot be a company domain.)
5. Run `npm test && npm run lint && npm run build`, then `npm run dev`. Open http://localhost:3000/apps/dwaar.

## 1. Employee (account A)

- [ ] Sign in with Google. The home page asks you to create a profile.
- [ ] Create a profile: choose "refer people", pick A's company, type your work email at that domain, tick "I accept referral requests", keep the weekly limit at 5. Saving works.
- [ ] A 6-digit code arrives by email. Enter it on the home page. The profile says the work email is confirmed.
- [ ] The Employee desk opens and shows "no requests yet" (not "switched off").

## 2. Candidate (account B)

- [ ] Sign in with the other Google account. Create a profile: choose "get referrals". Saving works.
- [ ] "Find jobs for my resume": upload a text-based PDF or Word resume, tick the consent box. You get 3 to 5 job titles and a list of companies. A's company is listed with a count of 1 and no employee names.
- [ ] Click a job title. The new-request form opens with the job filled in.
- [ ] Choose A's company, add a job link (https), paste a job description, upload the resume, tick consent.
- [ ] Click **Check my match**. You see a score, a summary and tips. Nothing is sent yet.
- [ ] Use a resume that clearly does not fit the job. The score is under 60 and **Send request** is refused with the tips shown.
- [ ] With a fitting resume (60 or more), click **Send request**. You land on My requests with the request shown as open.

## 3. Wave and accept (A and B)

- [ ] A receives an email about the new request (it shows the job, headline and name only: no resume, no email address).
- [ ] A opens the Employee desk. The request is there. A clicks **Accept**.
- [ ] B refreshes My requests. The request shows "accepted" with A's name and an **Open chat** link.

## 4. Chat

- [ ] B opens the chat and sends one message. Try an email address or phone number first: it is refused.
- [ ] B cannot send a second message before A replies.
- [ ] A opens the chat from the Employee desk and replies. A can reply up to 3 times. The fourth is refused.
- [ ] Nobody ever sees the other person's email address.

## 5. Invites and credits (needs the step 0.3 switches)

- [ ] A third Google account (C) signs in and creates a profile. On the home page, C enters B's invite code (shown on B's home page). It says the code is saved.
- [ ] B's credits still show 0.
- [ ] C checks a resume (60 or more) and sends a request to A's company. Then B and C both show **Credits: 1**.
- [ ] C sending a second request does not add credits. B using their own code is refused.

## 6. Boost (test mode)

- [ ] With 2 credits (send one more invited friend, or add credits in the SQL editor), B sees **Boost with 2 credits** on a request that has a resume. Clicking it takes the credits and shows the "choose your resume" step. Choosing the resume gives a Boost result page.
- [ ] Set `DWAAR_BOOST_ENABLED=true` and restart. On another request with a resume, **Boost this request** opens Razorpay. Pay with a Razorpay test card (see Razorpay's test card list). The payment confirms and the resume step appears.

## 7. Plus pass (test mode)

- [ ] On the home page B clicks **Dwaar Plus**. The page shows ₹199 for 30 days.
- [ ] Pay with a Razorpay test card. The page says the pass is active until a date, and the credits go up by 5.
- [ ] B can now run more than 5 resume checks in a day (up to 20).

## 8. Clean up

- [ ] B cancels an open request and deletes the profile from the home page. The resume file is gone.
- [ ] Set `DWAAR_BOOST_ENABLED`, `DWAAR_INVITES_ENABLED` and `DWAAR_PLAN_ENABLED` back to off if you are not launching those yet.

## If something fails

Write the step number, what you did, what you expected and what you saw (a screenshot helps). Do not paste secrets. Claude will fix it and add a test so it cannot return.
