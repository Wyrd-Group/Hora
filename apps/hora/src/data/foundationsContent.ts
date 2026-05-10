/**
 * foundationsContent.ts — Interactive F0 lesson content.
 *
 * Every F0 lesson is authored short-attention-span-first: 3–6 blocks,
 * at least one interactive block (microcard deck, scenario, calculator,
 * datasight chart, or casetree). Total read time per lesson ≈ 4–7 min.
 *
 * Mapped to OECD/INFE Core Competencies Framework on Financial Literacy
 * for Adults (2016) so this body of work is pitchable to NGOs.
 *
 * Shape: Record<lessonId, ContentBlock[]> — identical to courseContent.ts,
 * merged into the reader's lookup by CurriculumShell.
 */

import type { ContentBlock } from '../types/curriculum';

export const foundationsContent: Record<string, ContentBlock[]> = {

  // ══════════════════════════════════════════════════════════════
  //  MODULE 1 — Money & Earning
  // ══════════════════════════════════════════════════════════════

  'f0-m1-l1': [
    { type: 'heading', level: 2, content: 'What Money Really Is' },
    { type: 'text', content: 'Money is a <b>technology</b>, not a thing. Before money, people had to barter: if you made sandals and wanted bread, you had to find a baker who happened to want sandals that day. Economists call this the "double coincidence of wants" problem — and it is so inefficient that every civilisation independently invented some form of currency to solve it.' },
    { type: 'text', content: 'That technology does three distinct jobs at once. It is a <b>medium of exchange</b> (you can swap it for almost anything), a <b>unit of account</b> (it gives us a shared ruler to price things with), and a <b>store of value</b> (money you hold today should still buy something later). These three functions together are what make an object count as money. Cigarettes in a prison, shells in pre-colonial Melanesia, and euros on your phone all satisfy the same three conditions.' },
    { type: 'text', content: 'Modern money is <b>fiat</b>: it has no intrinsic value. A €20 note is a slip of polymer. It is valuable only because everyone around you agrees to accept it in exchange for real things — bread, rent, a haircut. That shared belief is backed by government enforcement (taxes must be paid in euros, debts can be settled in euros) and by central-bank credibility. When that belief cracks — Weimar Germany 1923, Zimbabwe 2008, Venezuela 2018 — money fails and people revert to older stores of value: gold, foreign currency, or barter.' },
    { type: 'text', content: 'This matters for you personally because money is not the goal. <b>Purchasing power is the goal</b>. Having €100,000 "in the bank" means nothing on its own; what matters is what that pile can buy in the future. A huge portion of this entire course — from inflation to investing to taxes — exists because fiat money slowly loses purchasing power over time, and the only defence is to convert money into assets that at least keep up.' },
    {
      type: 'microcard',
      title: '3 Functions of Money',
      cards: [
        { front: 'Medium of exchange',  back: 'Lets you trade without needing a "double coincidence of wants" — you don\'t need someone who both has bread AND wants your shoes.' },
        { front: 'Unit of account',     back: 'Gives us a common way to compare value. A €4 sandwich and a €400,000 house use the same ruler.' },
        { front: 'Store of value',      back: 'Money you don\'t spend today should still buy something tomorrow — although inflation slowly erodes this function.' },
      ],
    },
    { type: 'keyterm', term: 'Fiat money', definition: 'Currency that is money only because a government declares it legal tender — not backed by gold or any commodity. The euro, dollar, and yen are all fiat currencies.' },
    {
      type: 'scenario',
      title: 'You just got paid',
      prompt: 'Your €2,000 salary hits your account on Friday. You plan to hold it until rent is due on the 1st. Which function of money is most at risk during those 10 days?',
      choices: [
        { label: 'Medium of exchange — you can\'t spend it',            outcome: 'Partially right, but you\'re choosing not to. The function still works.' },
        { label: 'Unit of account — prices become unclear',              outcome: 'Unrelated to holding time. Prices are visible regardless.' },
        { label: 'Store of value — inflation erodes purchasing power',   outcome: 'Correct. If inflation is 6%/yr, 10 days costs you ~€3 in real terms. In a crisis (Argentina 2023: ~200% inflation) it is much worse.', correct: true },
      ],
    },
  ],

  'f0-m1-l2': [
    { type: 'heading', level: 2, content: 'Types of Income' },
    { type: 'text', content: 'Most people are taught to think of income as one thing — a salary. One employer, one paycheck, one line on a tax return. This model works when you are starting out, but it is also the single biggest reason middle-class earners never become wealthy: they are mono-income by default, which means every hour they don\'t work is an hour that pays nothing.' },
    { type: 'text', content: 'Wealthy households look very different on paper. Instead of one source, they <b>stack three different kinds of income</b>, each with its own mechanics and each taxed on its own schedule. <b>Active income</b> is wages — you trade time for money, and the moment you stop showing up, it stops. <b>Passive income</b> is cash that flows without ongoing labour: rent from a property, royalties on a book, advertising revenue on a YouTube channel that is already uploaded. <b>Portfolio income</b> is returns on capital: dividends paid by companies you own shares of, interest on bonds, capital gains when you sell assets for more than you paid.' },
    { type: 'text', content: 'The critical twist is that governments tax these three income types very differently. In France, top-bracket wage income is hit at roughly 45% income tax plus 22% in social charges — a total wedge of around 67%. The same €100,000 arriving as dividends or long-term capital gains is taxed at the 30% PFU flat rate. The US looks similar: ordinary income up to 37%, long-term capital gains 15–20%. This gap is the single most important reason that, over a lifetime, capital grows faster than wages.' },
    { type: 'text', content: 'You do not need to be rich to build a stack. Anyone can start: an index-fund contribution turns a wage into portfolio income the moment it pays its first dividend. A spare room on Airbnb converts a fixed asset into passive income. A side project that earns ad revenue stacks on top of a day job. The point of this lesson is not the accounting — it is the mindset shift: <b>you are trying to decouple your income from your time</b>. That decoupling is what "financial freedom" actually means.' },
    {
      type: 'microcard',
      title: 'Active vs. Passive vs. Portfolio',
      cards: [
        { front: 'Active income',     back: 'You trade time for money. Salaries, hourly wages, consulting fees. Stops the moment you stop working.' },
        { front: 'Passive income',    back: 'Money earned without active labour — rental income, royalties, affiliate revenue. Needs up-front capital or work.' },
        { front: 'Portfolio income',  back: 'Returns from owning financial assets — dividends, interest, capital gains. Often taxed lower than active income.' },
      ],
    },
    {
      type: 'datasight',
      title: 'DataSight: Tax wedge by income type',
      chartSpec:
`Top marginal rates (France, 2026, illustrative):
  Active income (salary):   45 %  +  SS contributions ≈ 22 %   → 67 % wedge
  Capital gains (long-term): 30 %  (PFU, flat)                  → 30 % wedge
  Dividends (non-PEA):       30 %  (PFU, flat)                  → 30 % wedge`,
      prompt: 'A high earner receives €100,000 in salary AND €100,000 in dividends in the same year. Roughly, what\'s the take-home difference?',
      options: ['About the same',  'Salary loses ~€67k, dividends lose ~€30k — a €37k gap',  'Salary is actually higher', 'Depends only on deductions'],
      correctIndex: 1,
      explanation: 'Passive/portfolio income is taxed far more gently in most EU countries — the core reason why wealth compounds faster than wages.',
    },
    { type: 'callout', variant: 'tip', title: 'Founder takeaway', content: 'Once your active income is stable, every extra euro should be channelled toward building <b>passive</b> and <b>portfolio</b> streams. That\'s how time and money decouple.' },
  ],

  'f0-m1-l3': [
    { type: 'heading', level: 2, content: 'Reading Your Paycheck' },
    { type: 'text', content: 'Somewhere between 40% and 60% of people who hold salaried jobs in the EU cannot explain the difference between their gross and net pay without guessing. They know what number hits the bank account and they know what they were promised at interview — and the huge gap in between is simply accepted. That gap is where the majority of your lifetime earnings go, and understanding it is the first real financial literacy test.' },
    { type: 'text', content: 'A payslip is a dense one-page summary of a surprising amount of information. At the top you have <b>gross pay</b> — the headline figure, your total earnings before anything is deducted. Below that come the subtractions, usually split into two groups. <b>Social contributions</b> (in France, <i>cotisations sociales</i>) fund pensions, public health insurance, unemployment, and sometimes supplementary pensions; these run around 22% of gross in France, 20% in Germany. <b>Income tax</b> is then withheld at source under the PAYE system ("prélèvement à la source" in French), based on a personalised rate your tax office sends to your employer.' },
    { type: 'text', content: 'Below the deductions come the <b>add-backs</b>: benefits in kind and employer contributions that you don\'t pay tax on. Meal vouchers (tickets restaurants), transport reimbursement, a fraction of your gym membership or private health top-up — each of these has subtle tax treatment that differs by country and sometimes by union agreement. Many employees never claim benefits they are legally entitled to simply because they never noticed them as a line item.' },
    { type: 'text', content: 'The number you actually want to watch is not just net pay but <b>year-to-date cumulative tax</b>. This figure tells you, at any point in the year, whether your withholding is roughly correct. If you had a bonus, changed jobs mid-year, or had an income drop, your withholding may be badly calibrated, and you will either owe a lump sum in the spring or be owed a big refund (which is simply an interest-free loan you gave the government). Reading your payslip for 30 seconds every month is one of the highest-ROI habits in personal finance.' },
    { type: 'keyterm', term: 'Gross pay',  definition: 'Your total earnings before any taxes or deductions are taken out.' },
    { type: 'keyterm', term: 'Net pay',    definition: 'What actually lands in your bank account after taxes, social security, and any voluntary deductions.' },
    {
      type: 'datasight',
      title: 'DataSight: French payslip anatomy',
      chartSpec:
`GROSS SALARY           3 000 €
─────────────────────────────
Social contributions  − 660 €  (~22%)  — pension, health, unemployment
Income tax (PAYE)     − 320 €  (~10.7% marginal after allowance)
Meal vouchers         +  80 €  (employer portion)
─────────────────────────────
NET PAY                2 100 €`,
      prompt: 'Based on this payslip, what is the effective total tax wedge (tax + SS as % of gross)?',
      options: ['10 %', '22 %', '~32 %',  '50 %'],
      correctIndex: 2,
      explanation: '(660 + 320) / 3000 ≈ 32.7%. France\'s true tax wedge is roughly double the visible income-tax number because payroll charges dominate.',
    },
    { type: 'callout', variant: 'warning', title: 'Check every line', content: 'Payroll errors are common. At minimum, verify your gross figure, your cumulative year-to-date tax, and whether benefits like meal vouchers or transport are correctly credited.' },
  ],

  'f0-m1-l4': [
    { type: 'heading', level: 2, content: 'Taxes on Income — The Basics' },
    { type: 'text', content: 'Nearly every developed country in the world taxes labour income <b>progressively</b>: the rate increases in steps — called brackets or bands — as your income rises. This design is a deliberate social choice, going back to the British income tax of 1842 and the US 16th Amendment of 1913. The philosophical argument is that an extra €100 matters more to someone earning €20,000 than to someone earning €500,000, so the state claims a larger percentage from the latter.' },
    { type: 'text', content: 'Here is the single most important rule, the one that 70% of adults get wrong: <b>only income that falls inside a given band is taxed at that band\'s rate</b>. If the 41% bracket in France starts at €83,823, and you earn €84,000, only the €177 above the threshold is taxed at 41%. The rest is taxed at the lower rates it corresponds to. This is called your <b>marginal rate</b>, and it is different from your <b>effective rate</b> (your total tax divided by total income), which will always be lower.' },
    { type: 'text', content: 'The myth that a raise can "push you into a higher bracket and cost you money" is one of the most destructive misconceptions in personal finance. It causes people to turn down promotions, refuse overtime, and underinvest in themselves. In a correctly-designed progressive tax system this is mathematically impossible: you always take home more after a raise, even if the marginal portion is taxed heavily. The only case where additional income ever reduces take-home is with <i>means-tested benefits</i> — certain welfare payments or tax credits that phase out sharply. Even then it is the benefit system, not the tax, that causes the cliff.' },
    { type: 'text', content: 'On top of this, many EU countries run parallel flat-rate systems for <b>capital income</b>. France uses the PFU (<i>Prélèvement Forfaitaire Unique</i>), a flat 30% on capital gains, dividends, and interest. Germany uses the 26.375% <i>Abgeltungsteuer</i>. These regimes sit alongside the progressive income-tax system and are why an investor earning their living from portfolio income can have a lower effective tax rate than a salaried employee earning half as much. Understanding where your income falls on this two-track system is the foundation for every tax-planning decision later in the course.' },
    {
      type: 'calculator',
      title: 'Marginal bracket explorer',
      calculator: 'budget-50-30-20',
    },
    {
      type: 'scenario',
      title: 'Bracket intuition',
      prompt: 'You earn €80,000. The top bracket you enter is 41%. Your friend warns: "Don\'t take the €2,000 raise — you\'ll get pushed into a higher bracket and lose money!" Is your friend right?',
      choices: [
        { label: 'Yes — higher bracket = lower take-home',                   outcome: 'Widespread myth. Only the euros above the threshold are taxed at the higher rate.' },
        { label: 'No — only the amount above the threshold is taxed higher', outcome: 'Correct. A raise never lowers take-home pay in a progressive system. Earning more always means keeping more.', correct: true },
        { label: 'It depends on whether you have deductions',                outcome: 'Deductions shift the threshold, but they can\'t make a raise net-negative under a progressive system.' },
      ],
    },
    { type: 'callout', variant: 'funfact', title: 'Fun fact', content: 'The 1944 "Pay-As-You-Earn" (PAYE) system, where employers withhold tax at source, was invented as a wartime measure to keep tax revenue flowing smoothly. Nearly every developed country now uses it.' },
  ],

  // ══════════════════════════════════════════════════════════════
  //  MODULE 2 — Spending & Budgeting
  // ══════════════════════════════════════════════════════════════

  'f0-m2-l1': [
    { type: 'heading', level: 2, content: 'Needs vs. Wants' },
    { type: 'text', content: 'Every budgeting system ever invented — from Dave Ramsey\'s envelope method to YNAB to the 50/30/20 rule you will learn next lesson — rests on a single foundational act: classifying each euro you spend as either a need or a want. Get this classification right and your budget almost builds itself. Get it wrong and no spreadsheet on earth will save you, because you will consistently underestimate how much is going to discretionary spending.' },
    { type: 'text', content: 'The honest definition of a <b>need</b> is surgical: it is something that, if you removed it, would immediately threaten your physical safety, your ability to work, or your legal standing. Shelter is a need. Food — in the most basic sense of calories and nutrition — is a need. Health insurance, transport to your job, and utilities are needs. Almost nothing else qualifies at the absolute level.' },
    { type: 'text', content: 'Everything else is a <b>want</b>, even when it is disguised as a need. "I need this car" — no, you need transportation; this specific car is a want. "I need Netflix" — you need rest and entertainment; this specific service is a want. "I need to eat out three times a week" — you need calories; the restaurants are a want. This is not moralistic; plenty of wants are wonderful and worth buying. But honesty about the label is what gives you power to choose. A want you consciously approve of is joy; a want mislabelled as a need is a cage.' },
    { type: 'text', content: 'Psychologists call the mislabelling process <b>hedonic adaptation</b>: last year\'s luxury becomes this year\'s baseline. The €6 almond latte that felt decadent a year ago now feels "what I always get". The mid-tier SUV feels necessary until you drive a friend\'s luxury model and suddenly that becomes the baseline. The budget skill is simply to notice this drift and intentionally re-label, on a quarterly basis, what is actually a need and what has quietly upgraded itself to one in your mind.' },
    {
      type: 'microcard',
      title: 'The honest classification',
      cards: [
        { front: 'Rent or mortgage',    back: 'NEED — shelter is non-negotiable. The question is only <i>how much</i> shelter.' },
        { front: 'A €1,300 iPhone',     back: 'WANT — a €300 phone makes calls and runs the same banking apps.' },
        { front: 'Netflix',             back: 'WANT — discretionary entertainment. Cheap in isolation, leak-y as a habit.' },
        { front: 'Groceries',           back: 'MOSTLY NEED — but grocery bills have a huge "wants" overlay (speciality coffee, premium brands, pre-made meals).' },
        { front: 'Health insurance',    back: 'NEED — catastrophic risk protection.' },
      ],
    },
    {
      type: 'scenario',
      title: 'Classify honestly',
      prompt: 'Your monthly Uber Eats spend is €280. You work 12 hours a day and cooking feels impossible. Need or want?',
      choices: [
        { label: 'Need — you physically can\'t cook',           outcome: 'You can. The need here is <i>food</i>, met at €200/mo from groceries + meal-prep. The delta is a convenience want.' },
        { label: 'Want — convenience paid for by time pressure', outcome: 'Correct. Recognising convenience as a want — not a need — is the first step. You might still choose it, but knowingly.', correct: true },
      ],
    },
  ],

  'f0-m2-l2': [
    { type: 'heading', level: 2, content: 'The 50 / 30 / 20 Rule' },
    { type: 'text', content: 'In 2005, before she became a US senator, Elizabeth Warren and her daughter Amelia Warren Tyagi published a book called <i>All Your Worth: The Ultimate Lifetime Money Plan</i>. Buried in it was a budgeting framework that has since become the default starting point for millions of households: <b>50% needs, 30% wants, 20% savings and debt paydown</b>. The ratios are not magic — they are a pragmatic compromise between mathematical rigour and human behavioural reality.' },
    { type: 'text', content: 'The 50% needs cap is the system\'s backbone. If your fixed costs — rent, utilities, groceries, transport, insurance — exceed half your take-home pay, the rule flags a structural problem before the budget even begins. It tells you that your housing is too expensive, your debts are too heavy, or your income is too low, and that no amount of coffee-trimming will fix it. The 30% wants bucket is the release valve: it grants you explicit permission to spend on dining, travel, hobbies, gifts, and entertainment without guilt. And the 20% savings floor is the non-negotiable future: without it, the other two numbers are just a nicer way of running in place.' },
    { type: 'text', content: 'The reason this rule works where more detailed systems fail is <b>cognitive load</b>. Most people cannot sustain a 30-category zero-based budget for more than a few months. They can, however, watch three numbers. That matters because the single best predictor of whether a budget will change your financial trajectory is not its accuracy but its <b>duration</b>: a rough system you run for five years beats a perfect system you abandon after six months.' },
    { type: 'text', content: 'The rule also reveals the two <b>only</b> levers you have for wealth-building. You can reduce needs (cheaper housing, cheaper car, cheaper country) or increase income (raise, promotion, side income, career change). Trimming wants rarely moves the needle meaningfully; the numbers are too small. If your 50% needs line is broken, no amount of discipline on wants will balance the equation. This is why financial advice rooted in "skip the latte" has poor outcomes for people who are genuinely squeezed — their problem is structural, not behavioural.' },
    {
      type: 'calculator',
      title: 'Your 50/30/20 split',
      calculator: 'budget-50-30-20',
    },
    { type: 'keyterm', term: 'Zero-based budget', definition: 'Every euro of income is assigned a purpose until the remainder is exactly zero. Forces intentionality, at the cost of more upfront work than 50/30/20.' },
    {
      type: 'scenario',
      title: 'What gives?',
      prompt: 'You earn €3,000 net. Your needs total €2,000 (rent, bills, groceries). That\'s 67% — way above the 50% bucket. What do you adjust?',
      choices: [
        { label: 'Cut savings to 5% to balance',                   outcome: 'Tempting but fatal. Savings should be the last line to cut — it\'s how future you escapes the squeeze.' },
        { label: 'Accept the imbalance and reduce "wants" aggressively', outcome: 'Viable short-term, but fragile.' },
        { label: 'Attack the biggest need: housing (cheaper place, roommate) or income (raise, side hustle)', outcome: 'Right answer. When the needs ratio is broken, the fix is structural — housing or income — not trimming coffee.', correct: true },
      ],
    },
  ],

  'f0-m2-l3': [
    { type: 'heading', level: 2, content: 'Tracking Expenses That Matter' },
    { type: 'text', content: 'Peter Drucker\'s famous line — "you cannot manage what you do not measure" — applies to personal finance as literally as to any business. People who do not know, within €100, how much they spent last month are flying blind. They will consistently make decisions that feel reasonable in isolation (one dinner out, one impulse purchase, one subscription) and be shocked when their bank balance reveals the aggregate truth.' },
    { type: 'text', content: 'But there is an equal and opposite mistake: <b>obsessive tracking</b>. Many enthusiasts start with a 40-category spreadsheet, commit to logging every cash coffee, and burn out in three weeks. The reason is that willpower is a finite resource. Every minute spent categorising a €2.40 bakery receipt is a minute (and a unit of cognitive energy) not spent on the decisions that actually move wealth — choosing your rent, picking investments, negotiating a salary. The right system is the <b>cheapest one you will actually run for five years</b>.' },
    { type: 'text', content: 'The Pareto principle applies with unusual force here. Roughly <b>80% of your spending</b> lives in about 20% of the categories: rent, groceries, transport, dining out, and subscriptions. A modern banking app (Revolut, Lydia, N26, Monzo, most neobanks) automatically categorises these from the transaction stream. You simply spend fifteen minutes once a week reviewing the auto-categorisation, fixing obvious errors, and scanning for surprises. This covers ~80% of your money with ~5% of the effort.' },
    { type: 'text', content: 'The remaining 20% — cash transactions, split bills, ambiguous expenses — is genuinely hard to track automatically. Resist the urge to perfect it. Instead, build a <b>recurring review habit</b>: every Sunday, 15 minutes, tea in hand. Are there subscriptions you are paying for and not using? Did any single category spike this week? Is there an expense you should plan for next month? These questions beat category precision by a wide margin, because they surface the decisions you actually need to make.' },
    { type: 'callout', variant: 'tip', title: 'The 80/20 of expense tracking', content: 'Bank-fed app categorisation handles 80% automatically. The remaining 20% (cash, splits, weird subscriptions) is where manual review earns its keep. Spend 15 minutes a week, not an hour a day.' },
    {
      type: 'microcard',
      title: 'Biggest leakage categories',
      cards: [
        { front: 'Recurring subscriptions', back: 'The average EU household pays for 11 subscriptions; 3 of them are forgotten. Audit quarterly.' },
        { front: 'Food delivery',            back: 'A €15 meal delivered averages €23 all-in with fees + tip. 50% overhead vs. cooking.' },
        { front: 'Small luxuries on autopilot', back: 'Coffee-shop rounds, rideshares, upgrades. Individually tiny, cumulatively ~15% of discretionary spend.' },
      ],
    },
  ],

  'f0-m2-l4': [
    { type: 'heading', level: 2, content: 'Lifestyle Creep' },
    { type: 'text', content: 'There is a paradox at the heart of modern earnings: people who earn two or three times the median income frequently report feeling just as financially stretched as people earning half that much. This is not an illusion or ingratitude. It is a measurable phenomenon called <b>lifestyle creep</b> — also known in the academic literature as <i>hedonic adaptation</i> or the <i>Easterlin paradox</i> — and it is the single largest destroyer of wealth among high earners.' },
    { type: 'text', content: 'The mechanism is ratchet-like. Each time income rises, expectations rise with it. The first raise justifies moving to a better neighbourhood. The second justifies replacing the old car with something a bit nicer. A promotion at work brings restaurants that used to feel extravagant into weekly rotation. A partner\'s raise justifies a bigger apartment, which justifies nicer furniture, which justifies a cleaning service. Each individual step feels reasonable, earned, modest. The cumulative effect is that <b>savings rates stay flat</b> — or fall — even as gross income doubles.' },
    { type: 'text', content: 'The clearest illustration is a thought experiment: Alice and Bob both earn €60k. Alice gets promoted to €120k and maintains her old lifestyle, saving the entire €60k delta. After ten years she has accumulated roughly €800k in invested savings. Bob gets the same promotion and slowly absorbs the extra €60k into rent, car, holidays, and general lifestyle upgrades. After ten years his savings have grown proportionally to his original rate — perhaps €80k in total. Same raise, same tax treatment, one tenth the wealth. The only variable was psychology.' },
    { type: 'text', content: 'The strongest defence is the <b>raise-redirect</b> rule: every time you get a pay bump, immediately automate a transfer that captures at least 50% of the new net amount into savings or investments, before it has a chance to become familiar in your checking account. You adapt to whatever balance you see there, so the trick is simply to make the raise invisible. Couples and individuals who practise this consistently are the ones whose wealth actually tracks their income — which is supposed to be how earning more works, and which almost nobody defaults to.' },
    {
      type: 'datasight',
      title: 'DataSight: Savings rates by income decile',
      chartSpec:
`ECB Household Finance and Consumption Survey (2023, stylised):
  Bottom 20%:   −3 %  (spend more than they earn)
  Middle 60%:    8 %
  Top 20%:      22 %
  Top 1%:       41 %`,
      prompt: 'Two earners make €5k/month net. Alice saves 20%; Bob saves 5% and spends the rest. After 20 years at 6% return, how do their nest eggs compare?',
      options: ['Bob has more (he\'s "enjoying life")', 'They\'re similar', 'Alice has ~€460k; Bob ~€115k — a 4× gap', 'Alice has about double'],
      correctIndex: 2,
      explanation: 'Savings rate × time × compounding = wealth. A 4× difference in savings rate produces a 4× difference in end-state wealth at the same income.',
    },
    { type: 'callout', variant: 'warning', title: 'The "raise test"', content: 'When you get a raise, immediately redirect 50% of the new cash flow into savings — <i>before</i> lifestyle inflation claims it. Done once per raise, this builds wealth without feeling deprived.' },
  ],

  // ══════════════════════════════════════════════════════════════
  //  MODULE 3 — Saving & Emergency Funds
  // ══════════════════════════════════════════════════════════════

  'f0-m3-l1': [
    { type: 'heading', level: 2, content: 'Why You Need an Emergency Fund' },
    { type: 'text', content: 'If personal finance had one near-universal consensus, it would be this: before you invest a single euro in stocks, before you pay extra on your mortgage, before you optimise anything, you build an emergency fund. It is not the most mathematically profitable use of cash — sitting in a savings account it will slightly lose to inflation — but it is the one decision that stabilises every other financial decision you ever make.' },
    { type: 'text', content: 'The function of an emergency fund is <b>not yield, it is insulation</b>. Without it, an unexpected €800 vet bill, a broken boiler, a short-term job loss, or a medical copay becomes a cascade. You reach for the nearest source of liquidity, usually a credit card at 19–22% APR. That €800 bill, paid over 24 months of minimums, becomes roughly €2,200. Worse, the balance sits there as a drag that prevents you from saving or investing for months. A single unexpected expense can set a household back by two years if the buffer is missing.' },
    { type: 'text', content: 'With an emergency fund, the same event is merely annoying. You swipe a debit card, your savings account dips, and next month you top it back up. The event is absorbed with zero behavioural or financial consequence. This difference — between <i>annoying</i> and <i>derailing</i> — is the hidden superpower of an emergency fund. It converts financial shocks from potentially catastrophic events into routine variance.' },
    { type: 'text', content: 'The standard recommendation is <b>three to six months of essential expenses</b>, with the range depending on how volatile your income is. A civil servant with a tenured contract needs less; a freelancer or commission-based worker needs more. Define "essential expenses" conservatively — rent, utilities, food, transport, insurance, minimum debt payments. Not your current lifestyle. If a real emergency hit, you would cut discretionary spending immediately, so you only need to cover the unavoidable floor. This usually comes out to something like €6,000–€15,000 for a single person in a European city. Build it before you do anything else.' },
    { type: 'keyterm', term: 'Emergency fund', definition: '3–6 months of essential living expenses, held in a liquid, accessible account. Not for opportunities, not for holidays — only for involuntary events.' },
    {
      type: 'scenario',
      title: 'The emergency test',
      prompt: 'Which counts as a real "emergency" worth tapping the fund?',
      choices: [
        { label: 'A concert ticket you want',             outcome: 'Voluntary, foreseeable. Save separately.' },
        { label: 'Your laptop dies and you need it for work', outcome: 'Arguable — if work is freelance, yes; if salaried and you can use a backup, no.' },
        { label: 'Surprise medical bill',                  outcome: 'Textbook emergency. Exactly why the fund exists.', correct: true },
        { label: 'Upgrading your phone',                   outcome: 'Foreseeable want. Not an emergency.' },
      ],
    },
  ],

  'f0-m3-l2': [
    { type: 'heading', level: 2, content: 'Compound Interest — The 8th Wonder' },
    { type: 'text', content: 'Legend credits Einstein with calling compound interest "the eighth wonder of the world" and adding that "he who understands it, earns it; he who doesn\'t, pays it". Einstein almost certainly never said this. The attribution is apocryphal. But the mathematical claim behind the quote is so striking that the misattribution has stuck — because compound interest really is the closest thing in finance to a free force of nature.' },
    { type: 'text', content: 'The mechanism is deceptively simple: you earn a return on your principal, and then in the next period you earn a return on <i>principal plus the previous return</i>. Each period\'s growth stacks on top of the accumulated base. For small numbers and short time horizons this barely matters. For large horizons — the kind personal finance actually cares about, 20, 30, 40 years — the results cross from merely impressive into genuinely counter-intuitive.' },
    { type: 'text', content: 'A €10,000 deposit earning a steady 7% real return (a reasonable long-run figure for a global equity index after inflation) becomes roughly €19,700 after 10 years, €38,700 after 20, €76,100 after 30, and €149,700 after 40. The last decade (years 30 to 40) alone adds more in absolute euros than the first 25 years combined. This is why starting early is worth more than starting with a bigger pile: the final years of the curve are where the bulk of the wealth is built, and you do not get to skip ahead.' },
    { type: 'text', content: 'The <b>Rule of 72</b> is the compound investor\'s mental shortcut: divide 72 by your annual rate of return and you get the approximate number of years it takes for your money to double. At 6%, money doubles in 12 years. At 8%, 9 years. At 12%, 6 years. This same arithmetic works against you too: at 3% inflation, money held as cash halves in real purchasing power in 24 years. The whole of long-term personal finance is a contest between compounding in your favour (investments) and compounding against you (inflation and interest on debt). Knowing which side of the curve you are on is the single most important financial habit you can build.' },
    {
      type: 'calculator',
      title: 'Run your own compound',
      calculator: 'compound',
    },
    {
      type: 'microcard',
      title: 'The Rule of 72',
      cards: [
        { front: '72 ÷ rate = years to double', back: 'At 6% annual growth, your money doubles in ~12 years. At 8%, ~9 years. At 12%, just 6 years.' },
        { front: 'Starting earlier > earning more', back: 'A 25-year-old saving €200/mo for 10 years then stopping beats a 35-year-old saving €200/mo for 30 years. Time is the primary ingredient.' },
        { front: 'Inflation works the same way — against you', back: 'At 3% inflation, money held in cash halves in purchasing power in ~24 years. The Rule of 72 cuts both ways.' },
      ],
    },
  ],

  'f0-m3-l3': [
    { type: 'heading', level: 2, content: 'Where to Keep Your Savings' },
    { type: 'text', content: 'Once you have decided to save, the question becomes: where exactly should the money sit? This decision is governed by two constraints that pull in opposite directions — <b>safety</b> (you cannot afford to lose it) and <b>accessibility</b> (you need it fast when an emergency hits). Between them, they rule out most investment products and leave a surprisingly narrow shortlist of correct answers.' },
    { type: 'text', content: 'Equities are immediately disqualified. A globally-diversified stock portfolio returns roughly 7% real per year over long horizons, but over any given year it can lose 30–40% of its value. Imagine you lose your job in a recession — the one moment you actually need the emergency fund — and your stock portfolio has simultaneously dropped 35%. You would be forced to sell at the worst possible price, turning a paper loss into a permanent one. Bonds have a milder version of the same problem: investment-grade corporate bonds lost double digits in 2022. Any asset with meaningful price volatility is the wrong vehicle for money you might need next month.' },
    { type: 'text', content: 'The correct tier is <b>cash-equivalent</b>: products designed to preserve capital and pay a modest market rate. The cheapest and simplest is a <b>high-yield savings account (HYSA)</b>, typically offered by online-only banks — N26, Revolut, Trade Republic, Boursorama, Fortuneo. They pay 3–4% at time of writing, are covered by the European deposit guarantee scheme up to €100,000 per bank per person, and allow instant access via transfer. The next step up is a <b>money-market fund</b>, which holds ultra-short-term government debt and pays fractionally more (3.5–4%) with one-business-day settlement.' },
    { type: 'text', content: 'A smart structure uses three layers. <b>Layer 1</b>: one month of expenses in your checking account, for pure convenience. <b>Layer 2</b>: two to four months of expenses in a HYSA at an online bank, earning close to the ECB deposit rate. <b>Layer 3</b>: anything extra in a money-market fund or a ladder of short-dated government T-bills. This structure sacrifices almost nothing in accessibility (all tiers can be liquidated within 1–3 business days) and captures nearly all of the yield you can safely get on cash. The difference between doing this and leaving everything in a zero-interest checking account is typically €300–€600 per year of pure free money.' },
    {
      type: 'datasight',
      title: 'DataSight: Yield vs. access',
      chartSpec:
`Current EU deposit options (2026 illustrative):
  Checking account:          0.00 %  — instant access
  Standard savings account:  0.50 %  — instant access
  High-yield savings:        3.50 %  — instant access (online banks)
  3-month T-bills:           3.70 %  — mature in 90 days
  Money-market funds:        3.80 %  — 1-day settlement`,
      prompt: 'You have €15,000 in a checking account earning 0%. Moving it to a 3.5% HYSA earns you approximately how much extra per year?',
      options: ['€50',  '€350',  '€525',  '€1,200'],
      correctIndex: 2,
      explanation: '€15,000 × 3.5% = €525/yr of "free money" just by moving the account. This is pure yield with no additional risk.',
    },
    { type: 'callout', variant: 'tip', title: 'Hybrid strategy', content: 'Keep 1 month of expenses in checking (instant liquidity), 2-5 months in HYSA (higher yield), and overflow in money-market funds or short T-bills. Same risk, better yield.' },
  ],

  // ══════════════════════════════════════════════════════════════
  //  MODULE 4 — Debt & Credit
  // ══════════════════════════════════════════════════════════════

  'f0-m4-l1': [
    { type: 'heading', level: 2, content: 'Good Debt vs. Bad Debt' },
    { type: 'text', content: 'Popular financial advice tends to split into two camps on debt. One side — the Dave Ramsey school — treats all debt as fundamentally evil: something to eliminate as fast as possible, full stop. The other side — most institutional investors and business-school textbooks — treats debt as neutral leverage, a tool that amplifies whatever it funds. The truth is closer to the second view with a large caveat: debt is a tool, but tools can maim you if you wield them wrong.' },
    { type: 'text', content: 'The useful distinction is between <b>good debt</b> and <b>bad debt</b>, and it depends entirely on two questions. First: <b>what is the borrowed money buying?</b> If it buys an asset that will appreciate (real estate in a growing area, a skill or degree that raises your earning power, the inventory of a profitable business), the debt is working for you — the asset grows while the loan shrinks. If it buys something that depreciates or evaporates (a luxury car, a holiday, a wardrobe, dinners out), the debt is working against you — the value is gone by the time you finish paying.' },
    { type: 'text', content: 'Second: <b>what does the debt cost, and does the return exceed it?</b> A 3% mortgage on a property returning 6% per year in rent and appreciation is structurally profitable — the spread is yours. A 22% credit-card balance funding restaurants returns zero. A 4% student loan for a medical degree is almost certainly good debt because the lifetime earnings uplift dwarfs the interest cost. A 7% car loan on a depreciating vehicle is almost certainly bad debt because you are paying interest on an asset that loses value faster than you can pay it off.' },
    { type: 'text', content: 'The framework also reveals why mortgages are uniquely attractive among consumer debt products. They are (a) the cheapest rate a consumer can get, (b) backed by an asset that historically appreciates roughly with inflation, (c) tax-advantaged in many countries, and (d) inflation-protected — because you repay in nominal euros that are worth less over time. This is why property ownership, done sensibly, is one of the most reliable wealth-builders for middle-class households: it is the one place where debt, asset, and tax code all line up in the borrower\'s favour. Credit cards sit at the opposite extreme on all four dimensions.' },
    {
      type: 'microcard',
      title: 'Debt classification',
      cards: [
        { front: 'Mortgage on a home',      back: 'Usually GOOD debt — low rate, backed by an appreciating asset, tax-deductible in many countries.' },
        { front: 'Student loan (STEM degree)', back: 'Often GOOD debt — expected income uplift exceeds the cost of borrowing.' },
        { front: 'Credit card revolving',   back: 'BAD debt — 15–25% APR, typically funds consumption, no asset backing.' },
        { front: 'Car loan (luxury)',       back: 'BAD debt — depreciating asset, 7–10% rates, funds a status purchase.' },
        { front: 'Business loan for a profitable venture', back: 'GOOD debt — if the business yield exceeds the interest rate.' },
      ],
    },
    {
      type: 'scenario',
      title: 'Is it good debt?',
      prompt: 'You\'re offered a €10,000 loan at 4% to buy a car that will depreciate 15%/yr. The car is for commuting to a job you already have.',
      choices: [
        { label: 'Good debt — car is necessary',          outcome: 'The <i>car</i> might be necessary, but the <i>loan</i> still loses money. 4% cost + 15% depreciation = 19% annual loss on the asset.' },
        { label: 'Bad debt — losing money from day one',   outcome: 'Correct. If you can buy a cheaper used car cash, do it. Debt is justified only when the return beats the cost.', correct: true },
      ],
    },
  ],

  'f0-m4-l2': [
    { type: 'heading', level: 2, content: 'Credit Scores — Why They Matter' },
    { type: 'text', content: 'Your credit score is a single number that tries to summarise, statistically, how likely you are to repay borrowed money. In the United States this is the FICO score (300–850). In the UK it is produced by Experian, Equifax, and TransUnion. In France and much of the eurozone there is no consumer-facing score in the same sense — banks instead rely on the Banque de France\'s payment-incident registry and their own internal scoring models — but the underlying idea is universal: lenders want to know your risk before they price a loan for you.' },
    { type: 'text', content: 'The number matters far more than most people realise because it is used to set the interest rate on every significant loan you ever take. A 100-point difference in a FICO score can move a mortgage rate from roughly 6% to roughly 8%. On a €300,000 loan over 30 years, that 2-point spread adds up to approximately €150,000 in additional interest paid over the life of the loan. The same principle applies on a smaller scale to car loans, personal loans, and even the insurance premiums and rental deposits you are quoted. Your score silently taxes every credit-adjacent transaction you will ever do.' },
    { type: 'text', content: 'Five factors drive the score, weighted roughly as follows. <b>Payment history (35%)</b> — have you paid bills on time? Even a single 30-day-late payment can cost 50+ points. <b>Credit utilisation (30%)</b> — what fraction of your available credit are you using right now? Keep this below 30%, ideally under 10%. <b>Length of credit history (15%)</b> — older accounts help. <b>New credit inquiries (10%)</b> — applying for lots of new credit at once is a risk signal. <b>Credit mix (10%)</b> — having a diverse set of credit types (card, installment loan, mortgage) is a mild positive.' },
    { type: 'text', content: 'The practical takeaways are few and powerful. Pay every bill on time, every time — automation is the only reliable defence. Keep utilisation low by paying balances down <i>before</i> the statement cuts, not after. Don\'t close old credit cards, even unused ones, because doing so shortens your history and raises utilisation. Don\'t apply for new credit in the six months before a mortgage application. And check your report annually — in the EU this is a free right under GDPR — because errors from identity mix-ups or data-reporting glitches are surprisingly common and can cost thousands if left uncorrected.' },
    { type: 'keyterm', term: 'Credit utilisation', definition: 'The fraction of your total available credit you\'re using. Keep it below 30% — lower is better. 10% utilisation is a credit-score sweet spot.' },
    {
      type: 'datasight',
      title: 'DataSight: What moves a credit score',
      chartSpec:
`FICO-style weighting (rough percentages):
  Payment history:          35 %
  Credit utilisation:       30 %
  Length of credit history: 15 %
  New credit / hard inquiries: 10 %
  Credit mix:               10 %`,
      prompt: 'You want to improve your score fast. Which lever has the biggest short-term impact?',
      options: ['Opening three new credit cards', 'Paying down balances to lower utilisation', 'Closing old accounts', 'Paying off one bill late to "establish" payment history'],
      correctIndex: 1,
      explanation: 'Utilisation updates monthly and drives 30% of the score. Paying balances down below 30% (ideally 10%) moves the needle fastest.',
    },
  ],

  'f0-m4-l3': [
    { type: 'heading', level: 2, content: 'Credit Cards — The APR Trap' },
    { type: 'text', content: 'A credit card is a profoundly two-faced financial product. Used one way, it is one of the best deals in personal finance: a free 20–50 day interest-free loan, plus fraud protection, plus chargeback rights, plus rewards worth 1–2% of every purchase. Used the other way, it is among the most punishing loans an ordinary consumer can take — annual percentage rates of 19–27% that compound daily, designed to turn a €500 impulse purchase into a years-long burden.' },
    { type: 'text', content: 'The difference between the two faces comes down to a single behaviour: <b>do you pay the statement balance in full, every month, on or before the due date?</b> If yes, you get the good version. You\'ve borrowed the bank\'s money for a few weeks, paid nothing for it, and pocketed the rewards. If no — if any balance rolls over into the next cycle — you get the bad version. The moment a balance rolls, most issuers start charging interest not just on the unpaid amount but also on new purchases from the day of purchase. This "trailing interest" is why the trap closes so fast.' },
    { type: 'text', content: 'The mathematics of minimum payments are designed to be toxic. A typical minimum payment is about 2% of the balance. On a €4,000 balance at 22% APR, the minimum is roughly €80/month. But 22% annual interest on €4,000 is about €73/month — meaning only €7 of that €80 payment actually reduces the principal. Scheduled out, paying minimums on a €4,000 balance takes more than nine years and costs more than €4,000 in interest alone. You end up paying for the original purchase twice. This is not a bug in the product — it is the business model.' },
    { type: 'text', content: 'The clean playbook: (1) set up <b>automatic payment of the full statement balance</b> from your checking account, with the bank, once per month — this is the single most important credit-card hygiene step and prevents 95% of the damage; (2) keep utilisation low by paying before the statement generates, not just before the due date; (3) if you are already carrying a balance, look for a <b>0% APR balance-transfer promotion</b> (common in the EU and UK) that lets you move the debt to a card charging no interest for 12–21 months, during which every euro you pay goes to principal. Discipline plus structure beats willpower alone.' },
    {
      type: 'calculator',
      title: 'The minimum-payment trap',
      calculator: 'loan',
    },
    {
      type: 'casetree',
      title: 'Case: Clara\'s €4,000 balance',
      tree: {
        root: 'start',
        nodes: {
          start: {
            text: 'Clara has €4,000 on a credit card at 22% APR. She can afford to pay €200/month. What does she do?',
            choices: [
              { label: 'Pay only the minimum (~€80/mo)', next: 'min',    score: -2 },
              { label: 'Pay €200/mo until cleared',      next: 'payoff', score:  3 },
              { label: 'Move the balance to a 0% APR transfer card (1 yr promo)', next: 'transfer', score: 5 },
            ],
          },
          min: {
            text: 'At €80/mo on a 22% card, Clara will take ~9 years to clear the balance and pay ~€4,300 in interest — more than the original debt.',
            choices: [
              { label: 'Switch to aggressive repayment', next: 'payoff', score: 2 },
              { label: 'Keep paying minimum',            next: 'disaster', score: -5 },
            ],
          },
          payoff: {
            text: 'At €200/mo, Clara clears the €4,000 in ~24 months and pays ~€950 in interest. Painful, but finite.',
            terminal: true,
            verdict: 'Solid outcome. Aggressive repayment is always the second-best option.',
          },
          transfer: {
            text: 'Clara moves the balance. 12 months of 0% APR means every euro goes to principal. Paying €333/mo clears it by month 12. Total interest: ~€120 (transfer fee).',
            terminal: true,
            verdict: 'Best outcome. Balance transfers are the single most powerful credit-card trick — when used with discipline.',
          },
          disaster: {
            text: 'Five years later, Clara has paid €4,800 in interest alone and still owes €2,100.',
            terminal: true,
            verdict: 'Worst outcome. Minimum payments are the bank\'s profit engine.',
          },
        },
      },
    },
  ],

  'f0-m4-l4': [
    { type: 'heading', level: 2, content: 'Loans & Mortgages' },
    { type: 'text', content: 'For most people, the mortgage on their home is the single largest financial product they will ever buy — larger than their pension, their car, their education combined. Yet the typical buyer spends more time researching a holiday than comparing mortgage offers. The gap between the best and worst quotes a single borrower receives on the same day can be 0.4–0.8 percentage points, and on a €300,000 25-year mortgage that spread represents €20,000–€40,000 in lifetime interest. The homework is enormously worth it.' },
    { type: 'text', content: 'A mortgage has four moving parts. <b>Principal</b> is the amount borrowed. <b>Interest rate</b> is the price you pay for the money. <b>Term</b> is the number of years over which you repay. <b>Amortisation</b> is the repayment schedule — a mathematical curve in which early payments are mostly interest and later payments are mostly principal. This last property matters because most people underestimate how much of the first decade of payments is effectively rent paid to the bank: on a typical 25-year loan, about 60% of year-one payments go to interest.' },
    { type: 'text', content: 'The most important variable is the <b>rate structure</b>. A <b>fixed-rate</b> mortgage locks the rate for the full term (or for the initial period — common in the UK and US to fix for 2–10 years and then float). It gives you budget certainty. A <b>variable-rate</b> mortgage moves with a reference index (Euribor in the eurozone, the Bank Rate in the UK). It is cheaper on average but exposes you to payment shock if rates rise. In France and Germany, long-duration fixed rates are the norm; in the UK and the Netherlands, 2–5 year fixes that then become variable are more common. The right choice depends on your income stability and how much rate risk you can stomach.' },
    { type: 'text', content: 'Three other numbers to watch. <b>Loan-to-value (LTV)</b> — the loan divided by the property price. Below 80% unlocks lower rates in most markets; below 60% unlocks the best. <b>Early repayment penalty</b> — some lenders charge if you pay ahead of schedule; in the EU this is legally capped but still meaningful. <b>Total cost of ownership</b> — in any honest mortgage comparison, you include notary fees, property taxes, insurance, and maintenance (budget roughly 1% of the property\'s value per year for repairs). A mortgage quote that looks like a bargain at 3.2% can easily become expensive at 3.6% all-in. Always run the numbers through a calculator that sums both interest and fees.' },
    {
      type: 'calculator',
      title: 'Monthly payment + total interest',
      calculator: 'loan',
    },
    {
      type: 'microcard',
      title: 'Mortgage vocabulary',
      cards: [
        { front: 'Principal',     back: 'The amount you borrowed. This is what you\'re slowly paying down.' },
        { front: 'Amortisation',  back: 'The payment schedule. Early payments are mostly interest; later payments are mostly principal.' },
        { front: 'Fixed vs. variable rate', back: 'Fixed: rate locked for term — protection against rises. Variable: tracks a market reference — cheaper if rates fall, dangerous if they rise.' },
        { front: 'LTV (loan-to-value)', back: 'Loan ÷ property value. Below 80% unlocks better rates and avoids mortgage insurance.' },
        { front: 'Early repayment penalty', back: 'Some lenders charge a fee if you pay off the loan faster. Read the contract — in the EU capped at ~3% of principal typically.' },
      ],
    },
  ],

  // ══════════════════════════════════════════════════════════════
  //  MODULE 5 — Banking & Payments
  // ══════════════════════════════════════════════════════════════

  'f0-m5-l1': [
    { type: 'heading', level: 2, content: 'Checking vs. Savings vs. HYSA' },
    { type: 'text', content: 'ECB household finance data shows that the median EU adult keeps somewhere between €5,000 and €12,000 in a standard bank checking account earning essentially zero percent interest. The reasons are a mix of inertia, convenience, and uncertainty about alternatives. At the eurozone level, this translates to hundreds of billions of euros of consumer cash quietly losing purchasing power to inflation every year while the banks who hold it earn a steady spread by lending it out.' },
    { type: 'text', content: 'The three main account types you should understand are straightforward. A <b>checking account</b> (current account, compte courant, Girokonto) is designed for flow: salary in, bills out, card spending, direct debits. Almost all banks pay 0% interest on checking in the EU because the regulator tolerates it and customers expect it. A <b>traditional savings account</b> at a high-street bank pays a nominal rate — 0.1% to 1%. A <b>high-yield savings account (HYSA)</b>, typically offered by online-only banks and some fintechs, pays close to the ECB deposit rate, which as of 2026 sits around 3–3.5%.' },
    { type: 'text', content: 'The difference between "close to zero" and "close to ECB rate" is enormous at the margin. On a €15,000 cash buffer, a 3% difference is €450 per year in pure free money — and it requires no skill, no research beyond picking a reputable online bank, no ongoing effort. This is genuinely the closest thing in personal finance to arbitrage for a consumer. There is almost no trade-off: EU deposit insurance covers online banks exactly as it covers brick-and-mortar ones (up to €100,000 per person per institution).' },
    { type: 'text', content: 'The standard setup is a two-account structure. Keep roughly one month of expenses in a checking account at whatever bank gives you the best card, the best app, and the easiest way to handle daily life. Keep everything above that in a HYSA at an online bank (N26, Trade Republic, Boursorama, Fortuneo, Monese, Revolut are common choices). Link the two so transfers between them are one-tap and settle in a few seconds via SEPA Instant. Once set up, this system runs forever on its own, and the yield it captures over a lifetime of holding a cash buffer adds up to tens of thousands of euros.' },
    {
      type: 'microcard',
      title: 'Account types',
      cards: [
        { front: 'Checking',  back: 'Designed for flow: bills, salary deposit, card spending. Usually zero interest. Keep 1 month of expenses here.' },
        { front: 'Savings',   back: 'Traditional bank savings: 0–1% interest, instant access. Better than checking, worse than HYSA.' },
        { front: 'HYSA',      back: 'High-yield savings: often online-only banks at 3–4% interest. Same instant access, 5× the yield.' },
        { front: 'Term deposit / CD', back: 'Lock money for 3, 6, 12 months at a fixed rate. Highest yield of the "safe" options, but no early access (or with penalty).' },
      ],
    },
    { type: 'callout', variant: 'tip', title: 'Lazy optimisation', content: 'Move everything above 1 month of expenses from checking to HYSA. No behaviour change required — just a one-time setup. Yield gained: typically €200–500/yr.' },
  ],

  'f0-m5-l2': [
    { type: 'heading', level: 2, content: 'Payment Rails: SEPA, SWIFT, Card' },
    { type: 'text', content: 'When you send money from your account to someone else\'s, it does not move physically. No euros are couriered. Instead, a message passes between two banks through a network called a <b>payment rail</b>, and each bank updates its internal ledger to reflect the new balance. The rail that carries the message determines the cost, the speed, the reliability, and — crucially — what rights you have if something goes wrong. Most consumers never learn this, and as a result they overpay by hundreds of euros a year on transfers they do not realise could be free.' },
    { type: 'text', content: 'Inside the EU and the adjacent European Payments Area, the dominant rail is <b>SEPA</b> (Single Euro Payments Area). A standard SEPA Credit Transfer is free, works between any EU account, and settles within one business day. SEPA Instant, rolled out since 2017 and mandated across the eurozone from 2025, is functionally the same but settles in under ten seconds at any hour. A SEPA Direct Debit lets merchants pull money from your account after you authorise it — this is how most utilities, subscriptions, and landlords collect payments in Europe.' },
    { type: 'text', content: 'When money needs to cross into a non-euro or non-EU destination, the traditional rail is <b>SWIFT</b> — a 50-year-old bank messaging network that chains transactions through correspondent banks. SWIFT is powerful but slow (1–3 business days) and expensive (€5–€30 per transfer plus currency-conversion markups hidden in the FX rate). For large transfers this is acceptable; for small personal ones it is wasteful. Fintechs like <b>Wise</b> (formerly TransferWise) and <b>Revolut</b> exist specifically to bypass this — they match currency flows across their own internal ledgers, charge a transparent 0.3–0.5% fee, and deliver in minutes. For international transfers under €10,000, they are almost always the correct choice.' },
    { type: 'text', content: 'Card payments (Visa, Mastercard, and national schemes like France\'s CB) run on a completely different rail designed for point-of-sale. The consumer experience is free, but behind the scenes the merchant pays 1–3% of every transaction in <b>interchange fees</b>, which covers fraud risk, chargeback rights, and rewards. This is why card payments offer strong consumer protection: under Visa/Mastercard rules and EU PSD2, you can dispute unauthorised or undelivered transactions and get your money back. Knowing this is a quiet superpower — it means a card payment to a sketchy online merchant is genuinely safer than a SEPA transfer, because the card dispute process is your insurance policy.' },
    {
      type: 'datasight',
      title: 'DataSight: Comparing rails',
      chartSpec:
`Rail               Speed          Cost       Use case
──────────────────────────────────────────────────────
SEPA Credit         < 1 day        Free       EU-wide standard transfer
SEPA Instant        < 10 seconds   Free/€0.10 SEPA but instant
SWIFT (cross-border) 1–3 days      €5–€30     Non-EU or multi-currency
Card (Visa/MC)      Instant auth    1–3% fee  Point-of-sale + chargebacks
Wise / Revolut      Minutes         ~0.3–0.5% FX-friendly alt to SWIFT`,
      prompt: 'You need to send €5,000 to your landlord in Portugal tomorrow. Cheapest reliable option?',
      options: ['International wire (SWIFT)',  'SEPA credit transfer',  'Card payment',  'Western Union'],
      correctIndex: 1,
      explanation: 'Portugal is inside SEPA — a standard SEPA transfer is free and arrives within a business day. SWIFT would cost €10–30 for the same result.',
    },
  ],

  'f0-m5-l3': [
    { type: 'heading', level: 2, content: 'How Banks Make Money' },
    { type: 'text', content: 'The core business of a commercial bank is simple enough to explain in one sentence: <b>borrow short, lend long</b>. A bank takes deposits from thousands of customers — money that can in theory be withdrawn at any moment — and uses it to fund mortgages, business loans, and credit cards that will be repaid over years or decades. The fact that not everyone withdraws at once is what makes the trick work. The difference between the rate paid to depositors and the rate charged to borrowers is called the <b>net interest margin</b>, and it is the single largest source of revenue for almost every commercial bank in Europe.' },
    { type: 'text', content: 'The numbers are striking when written out. A typical EU retail bank pays its checking-account depositors 0% and its savings-account depositors perhaps 1%. It lends the same money at 3–4% for a mortgage, 6–8% for a car loan, and 15–25% on revolving credit cards. The weighted average spread — roughly 2 to 4 percentage points across the loan book — is the engine. For a bank with €100 billion in loans, a 3% net interest margin generates €3 billion in annual gross revenue before any fees.' },
    { type: 'text', content: 'Banks layer other revenue streams on top of this core. <b>Fee income</b> comes from overdrafts, ATM withdrawals outside the network, wire transfers, foreign-exchange spreads on card transactions abroad, and account-maintenance charges. This has been squeezed by PSD2 regulation and neobank competition but still represents 15–30% of retail bank income. <b>Investment banking</b> — underwriting bond and equity issues, M&A advisory, market-making in securities — serves corporate clients and can be enormously profitable in good years. <b>Wealth management</b> charges a recurring fee, usually around 1% of assets under management, on the portfolios of mass-affluent clients.' },
    { type: 'text', content: 'This business model is fundamentally fragile. Because the bank promises instant withdrawal on deposits but holds long-dated loans as assets, if a large fraction of depositors demand their money simultaneously — a <b>bank run</b> — the bank cannot satisfy them without selling loans at a loss. This is why central banks exist as lenders of last resort, why deposit insurance covers €100,000 per customer in the EU, and why the 2008 financial crisis and the 2023 Silicon Valley Bank collapse both ended with emergency government intervention. The business model works because most of the time, most depositors leave their money alone.' },
    {
      type: 'microcard',
      title: 'Four revenue streams',
      cards: [
        { front: 'Net interest margin (NIM)', back: 'The spread between loan rates and deposit rates. Biggest line for traditional banks — typically 2–4% of their loan book.' },
        { front: 'Fees',                       back: 'Overdraft, ATM, card transaction, wire transfer. Slowly being squeezed by regulation (PSD2) and competition (neobanks).' },
        { front: 'Investment banking',         back: 'Underwriting IPOs, M&A advisory, trading. Lucrative but cyclical.' },
        { front: 'Wealth management',          back: 'AUM fees on rich clients\' portfolios. Stable recurring revenue.' },
      ],
    },
    { type: 'callout', variant: 'funfact', title: 'Fractional reserve in numbers', content: 'For every €100 deposited at a typical EU bank, about €90 is lent back out as loans. The bank only keeps ~€10 in reserves. This is why central-bank liquidity matters so much — a bank run breaks the model.' },
  ],

  // ══════════════════════════════════════════════════════════════
  //  MODULE 6 — Markets & Investing Basics
  // ══════════════════════════════════════════════════════════════

  'f0-m6-l1': [
    { type: 'heading', level: 2, content: 'What is a Stock?' },
    { type: 'text', content: 'When you buy a stock — called a share in European usage — you are buying <b>legal ownership of a fraction of a real business</b>. This is not a metaphor. If a company has 10 million shares outstanding and you own one, you own one ten-millionth of its factories, its trademarks, its cash in the bank, its loyal customers, and its future profits. You also own the same fraction of its debts, its lawsuits, and its risks. Unlike a savings account or a bond, you are not lending money you will get back — you are buying a permanent slice of a living business.' },
    { type: 'text', content: 'Your ownership entitles you to two kinds of return. The first is <b>capital appreciation</b>: if the company becomes more valuable — more customers, more profit, a better competitive position — other investors will pay more for the shares, and the price you see on your brokerage app rises. You realise this gain only when you sell. The second is <b>dividends</b>: cash that the company distributes to its shareholders out of its profits, usually quarterly or annually. Mature companies (utilities, consumer staples, banks) tend to pay large dividends; growth-stage companies (tech, biotech) usually pay none and reinvest profits to grow faster.' },
    { type: 'text', content: 'Being a shareholder also gives you formal <b>voting rights</b> at the company\'s annual general meeting — one vote per share, in most structures — on issues like electing board members, approving executive pay, and authorising major transactions. For a retail investor owning a few hundred shares of a €200 billion company, the vote is effectively symbolic. For an institutional investor owning 5% of a company, the votes are power. This is why activist funds like Elliott Management or Cevian can force CEOs to resign, spin off divisions, or accept takeover offers.' },
    { type: 'text', content: 'Stocks are powerful but genuinely risky. As an owner, you sit at the <b>bottom of the capital structure</b>: if the company goes bankrupt, creditors and bondholders are paid first, and shareholders typically get nothing. Individual stocks can go to zero — Lehman Brothers and Wirecard shareholders lost 100% overnight. This asymmetry is exactly why the next two lessons focus on diversification and index funds: the long-run returns of owning equities are excellent, but you capture them reliably only when you spread the risk across hundreds or thousands of companies rather than betting on a handful.' },
    {
      type: 'microcard',
      title: 'Returns come from two sources',
      cards: [
        { front: 'Capital appreciation', back: 'The share price rises. You sell higher than you bought. Taxed as capital gains.' },
        { front: 'Dividends',             back: 'The company pays out cash to shareholders, usually quarterly. Taxed separately as dividend income.' },
      ],
    },
    {
      type: 'scenario',
      title: 'Buying stock = ?',
      prompt: 'You buy 10 shares of LVMH at €700 each. Strictly speaking, you now own...',
      choices: [
        { label: 'A loan to LVMH that they will repay',   outcome: 'That would be a bond.' },
        { label: 'A small fraction of LVMH — including its profits, risk and voting rights', outcome: 'Correct. Equity = ownership. If LVMH doubles profits, your share is worth more. If it goes bankrupt, you\'re last in line.', correct: true },
        { label: 'A promise from LVMH\'s CEO',            outcome: 'Not a thing.' },
      ],
    },
  ],

  'f0-m6-l2': [
    { type: 'heading', level: 2, content: 'Bonds — Lending to Governments & Companies' },
    { type: 'text', content: 'Where stocks make you an owner, bonds make you a <b>lender</b>. When you buy a bond, you are handing cash to an entity — a government, a municipality, or a corporation — in exchange for a contractual promise: they will pay you a fixed stream of interest on a defined schedule, and return the original principal on a stated date called <b>maturity</b>. The promise is legally binding and ranks ahead of equity in the capital structure, which is why bonds are considered safer than stocks of the same issuer.' },
    { type:'text', content: 'The global bond market is about twice the size of the global stock market. Governments are the largest issuers. When France borrows, it sells OATs (Obligations Assimilables du Trésor). Germany issues Bunds. The US sells Treasuries. Italy sells BTPs. Corporations issue bonds too, and these carry a higher yield to compensate for the higher risk of default. Rating agencies (S&P, Moody\'s, Fitch) score each issuer on a scale: AAA is the safest (German government), BBB is the edge of "investment grade", below that is "high yield" or "junk", down to C and D (defaulted).' },
    { type: 'text', content: 'A bond has three essential parameters. The <b>coupon</b> is the interest rate expressed as a percentage of face value — a €1,000 bond with a 4% coupon pays €40 a year. The <b>maturity</b> is how long until you get your principal back — could be 30 days or 100 years. The <b>price</b> is what the bond currently trades at in the secondary market, which fluctuates with interest rates. The key figure investors watch is <b>yield to maturity</b>: the effective return you earn if you buy the bond now and hold it to maturity, reinvesting all coupons at the same rate. This is the honest apples-to-apples comparison number.' },
    { type: 'text', content: 'The single most important mechanical fact about bonds is that <b>prices and yields move in opposite directions</b>. If the market interest rate rises, your existing bond — locked at the old lower coupon — becomes less attractive and its market price falls. If rates fall, your bond becomes more valuable and its price rises. This is why the 2022 bond market collapse (as central banks hiked rates rapidly) inflicted double-digit losses on bond funds that had been pitched as "safe". Bonds are safer than stocks in a credit-risk sense, but they carry interest-rate risk — especially long-duration bonds. Understanding this inverse relationship is the single biggest unlock in fixed-income investing.' },
    {
      type: 'calculator',
      title: 'Bond price calculator',
      calculator: 'bond-price',
    },
    {
      type: 'keyterm',
      term: 'Yield to maturity (YTM)',
      definition: 'The total return you\'ll earn if you hold the bond to maturity, reinvesting all coupons at the same rate. It is the "internal rate of return" of the cash-flow stream.',
    },
    { type: 'callout', variant: 'tip', title: 'Inverse relationship', content: 'Bond prices and yields move in <b>opposite directions</b>. If the market rate rises, your existing bond (locked at a lower rate) falls in price. This is the central intuition for all fixed-income investing.' },
  ],

  'f0-m6-l3': [
    { type: 'heading', level: 2, content: 'ETFs & Index Funds' },
    { type: 'text', content: 'If you had to name the single most important financial invention for ordinary people of the last fifty years, the honest answer is probably the <b>index fund</b>. Pioneered by Jack Bogle at Vanguard in 1975, and later repackaged as the Exchange-Traded Fund (ETF) in 1993, the idea is almost embarrassingly simple: instead of trying to pick stocks, buy a tiny slice of the entire market and hold it. That idea has transferred literally trillions of dollars from the financial industry to the pockets of savers.' },
    { type: 'text', content: 'Mechanically, an ETF is a basket of securities wrapped in a single share that you can buy on a stock exchange exactly like any other stock. An S&P 500 index ETF like VUSA or CSPX holds, in precise weighted proportions, the 500 largest companies in the US. An MSCI World ETF holds roughly 1,500 large- and mid-cap companies across 23 developed markets. A global all-world ETF like VWCE holds nearly 4,000 stocks spread across developed and emerging markets. One purchase gives you ownership of the entire global economy.' },
    { type: 'text', content: 'The reason index funds win against actively-managed funds is not sophistication — it is <b>fees</b>. A good index ETF charges an ongoing fee (the total expense ratio, or TER) of 0.05% to 0.25% per year. A typical active fund charges 1.0% to 1.5%. That fee gap sounds small but compounds savagely. On €100,000 invested over 30 years at a 7% return, the index fund grows to roughly €740,000. The active fund, dragged down by its extra 1% fee each year, grows to roughly €560,000. The fee alone transfers €180,000 from the investor to the fund manager, and it does this silently — most investors never notice because the fee is netted out of the returns before they see them.' },
    { type: 'text', content: 'The evidence on active management is overwhelming and has been for decades. The SPIVA report, published twice a year by S&P, consistently shows that 80–90% of active equity funds underperform their benchmark over 15-year horizons. Warren Buffett — widely considered the best stock-picker alive — famously advised his wife that when he dies, 90% of her money should go into an S&P 500 index fund. For a retail investor starting out in 2026, the default answer to "what should I invest in?" should be: a single low-cost global equity ETF held inside a tax wrapper (PEA in France, ISA in the UK, Depot in Germany). Everything else is optimisation around that baseline.' },
    {
      type: 'datasight',
      title: 'DataSight: Active vs. passive over 20 years',
      chartSpec:
`SPIVA EU report (2023, 20-year horizon):
  % of active equity funds beating their benchmark:  ~15 %
  Average fee of active fund:                         1.2 % / yr
  Average fee of index fund:                          0.1 % / yr
  Fee drag on €100k over 20 yrs @ 7 %:     Active: −€84k   Index: −€7k`,
      prompt: 'What\'s the single biggest reason 85% of active funds underperform?',
      options: ['Bad managers', 'Fees compounding against the investor year after year', 'Regulation', 'Bad luck'],
      correctIndex: 1,
      explanation: 'It is NOT primarily skill. The 1.1% annual fee gap compounds to devastating levels over 20 years. Index funds win by showing up and costing nothing.',
    },
    { type: 'callout', variant: 'example', title: 'The Buffett wager', content: 'In 2007 Warren Buffett bet $1M that an S&P 500 index fund would beat a curated hedge-fund portfolio over 10 years. He won. The index returned 7.1%/yr; the hedge funds averaged 2.2%/yr. Fees.' },
  ],

  'f0-m6-l4': [
    { type: 'heading', level: 2, content: 'Risk vs. Return' },
    { type: 'text', content: 'There is an iron law of finance that every new investor needs to internalise before making a single trade: <b>expected return rises with risk, always, and there is no free lunch</b>. If someone offers you an investment that returns 15% per year with no possibility of loss, either you have misunderstood the product, the marketing has lied to you, or it is a fraud. There are no exceptions. Every major financial disaster of the last forty years — Long-Term Capital Management, Madoff, subprime mortgages, FTX — involved investors briefly believing this law had been suspended.' },
    { type: 'text', content: 'The academic definition of risk in finance is <b>volatility</b>: how much an asset\'s price bounces around over time. Cash in a deposit account has a volatility near zero — its nominal value does not move — which is why it pays a low return. A globally-diversified equity portfolio has an annual standard deviation of around 16%, meaning the typical year\'s return is 16 percentage points above or below its long-run average of roughly 7–8% real. Individual stocks run at 30–50% annual volatility. Leveraged derivatives can run at 100% or more. The higher the volatility, the higher the return you must be paid in expectation, because investors demand compensation for enduring the ride.' },
    { type: 'text', content: 'There is a hierarchy that every investor should be able to reproduce from memory. <b>Cash and short-term government debt</b> sit at the bottom — low risk, 3–4% nominal yield today. <b>Investment-grade bonds</b> come next — low-to-moderate risk, 4–6% yield. <b>High-yield corporate bonds</b> ("junk") — real default risk, 7–9% yield. <b>Broad equity indices</b> — significant volatility with 30–50% drawdowns every decade or so, 7–10% long-run return. <b>Single stocks, small caps, emerging markets, and real estate</b> — higher volatility, higher expected return. <b>Leverage, options, crypto</b> — extremely high volatility, very wide range of possible outcomes including total loss.' },
    { type: 'text', content: 'The two practical mistakes are mirror images of each other. <b>Over-investing in cash</b> feels safe but silently loses to inflation — over 30 years at 3% inflation, cash loses nearly 60% of its purchasing power. <b>Over-investing in speculation</b> (options, crypto, hot single stocks) can deliver home runs but routinely produces total losses. The correct position for a long-horizon investor (retirement, house purchase 10+ years out) sits squarely in the middle: a diversified equity allocation large enough to build real wealth, combined with a cash buffer sized to absorb emergencies without selling anything in a downturn. The exact split depends on your age and temperament, but the logic always rests on this risk/return trade-off.' },
    {
      type: 'microcard',
      title: 'The risk ladder (roughly)',
      cards: [
        { front: 'Cash / HYSA',          back: '3–4% yield. Zero market risk. Inflation risk only.' },
        { front: 'Government bonds',     back: '3–5% yield. Very low default risk (core EU). Interest-rate risk.' },
        { front: 'Investment-grade corp bonds', back: '4–6% yield. Default + rate risk.' },
        { front: 'High-yield / junk bonds', back: '7–10% yield. Real default risk. Correlated with equities in crisis.' },
        { front: 'Broad equity index',   back: '7–10% long-run return. ~20% volatility. 40% drawdowns happen.' },
        { front: 'Individual stocks',    back: 'Same long-run return expected. 3–5× the volatility. Can go to zero.' },
        { front: 'Leverage / derivatives', back: 'Amplified. Can 10× a position — or wipe you out in a day.' },
      ],
    },
  ],

  'f0-m6-l5': [
    { type: 'heading', level: 2, content: 'Diversification — Don\'t Put All Eggs in One Basket' },
    { type: 'text', content: 'In 1952, a young economist named Harry Markowitz published a paper called "Portfolio Selection" in the Journal of Finance. It was 14 pages long, full of equations, and it earned him the 1990 Nobel Prize in Economics. The practical result of the paper was a simple and radical claim: by combining assets whose returns do not move in lockstep, an investor can reduce overall portfolio risk <i>without</i> reducing expected return. Markowitz himself later called diversification "the only free lunch in finance". The phrase stuck because, at the time, nobody had formally proven that such a trade-off did not have to be a trade-off.' },
    { type: 'text', content: 'The intuition is accessible without the math. Every company has two kinds of risk. <b>Idiosyncratic risk</b> is company-specific: the CEO gets caught in a fraud scandal, a product recall, a lawsuit, a factory fire. <b>Systematic risk</b> is market-wide: a recession, a war, a pandemic, a rate shock. When you own a single stock, you bear both. When you own many stocks from many sectors, the idiosyncratic risks largely cancel out — one company\'s fraud is another company\'s market-share gain — and what remains is mostly the systematic component. You keep the market\'s return and shed a big chunk of the volatility.' },
    { type: 'text', content: 'The numbers are striking. The standard deviation of annual returns on a single randomly-chosen stock is around 35%. Just 10 stocks, sensibly spread across sectors, already drops that to roughly 22%. Thirty stocks gets you to about 19%. An S&P 500 index sits at around 16%. A globally-diversified 60/40 stocks-and-bonds portfolio drops to about 11%. Going from one stock to 500 roughly <b>halves your volatility</b> while keeping the same long-run expected return — because the component you are shedding (idiosyncratic risk) was never compensated to begin with.' },
    { type: 'text', content: 'True diversification is more than just "many stocks". It means spreading across <b>geographies</b> (US, Europe, emerging markets — which outperform each other in different decades), <b>asset classes</b> (equities, bonds, real estate, a modest allocation to commodities), <b>sectors</b> (no more than 15–20% of your portfolio in any one industry), and <b>currencies</b> (your spending currency weight should not be 100%, since a domestic crisis can hit both your income and your savings at once). A simple way to achieve most of this is a single global index ETF plus a high-quality bond ETF. A slightly more elegant version adds a small allocation to REITs and emerging markets. In practice, you do not need to be clever — just broad.' },
    {
      type: 'datasight',
      title: 'DataSight: Risk collapse through diversification',
      chartSpec:
`Standard deviation of annual returns (approximate):
  1 stock picked at random:            35 %
  10 stocks:                           22 %
  30 stocks:                           19 %
  S&P 500 (500 stocks):                16 %
  Global diversified (60/40 stocks/bonds): 11 %`,
      prompt: 'Why does diversification work so well between the 1-stock and 30-stock case?',
      options: ['Fewer stocks are riskier because the CEO could die', 'Idiosyncratic (company-specific) risk averages out across many holdings', 'Bigger portfolios get cheaper fees', 'Luck'],
      correctIndex: 1,
      explanation: 'Each company has specific risk (lawsuit, fraud, product flop) that\'s independent of the broad market. Averaged across many names, those risks cancel — only broad market risk remains.',
    },
  ],

  // ══════════════════════════════════════════════════════════════
  //  MODULE 7 — Insurance & Risk Protection
  // ══════════════════════════════════════════════════════════════

  'f0-m7-l1': [
    { type: 'heading', level: 2, content: 'Why Insurance Exists — Risk Pooling' },
    { type: 'text', content: 'Insurance is one of humanity\'s most elegant social inventions, older than banking, older than the stock market, and possibly older than money itself. The earliest known insurance contracts appear in Babylonian caravan trading around 1750 BCE and in the Rhodes maritime code around 800 BCE. The core insight has never changed: a <b>small, certain, manageable cost</b> paid regularly by many people can fund the <b>large, unpredictable, catastrophic loss</b> suffered by a few. Without this structure, many of the things modern life depends on — shipping, construction, medicine — would simply not happen.' },
    { type: 'text', content: 'The mathematical engine under the hood is called the <b>law of large numbers</b>. Any individual\'s risk of needing to claim is unpredictable. But across a pool of ten thousand similar policyholders, the total number of claims in a year is remarkably stable — so stable that insurers can price premiums with actuarial precision. This is the same principle that lets casinos operate: any individual gambler might win, but the house is guaranteed to win over millions of hands. Insurance flips the casino on its head: the insurer plays the house, but the "winners" (claimants) are the people who suffer real losses, and everyone else benefits from the peace of mind of coverage.' },
    { type: 'text', content: 'The practical decision framework for buying insurance is a single question: <b>can I absorb this loss without it ruining me financially?</b> If the answer is yes, you do not need insurance for that event — the premium is just a fee for convenience, and over time you will pay more in premiums than you would in actual losses. If the answer is no, you need insurance, and paying premiums is a rational transfer of unaffordable risk to an entity that can pool it.' },
    { type: 'text', content: 'This is why the insurance products worth buying and the ones worth skipping often surprise people. You almost certainly need <b>health insurance</b> (a €100,000 hospital stay would wipe out most households) and <b>liability insurance</b> (a successful lawsuit could ruin you for life). You probably do not need <b>extended warranties</b> on appliances (a €400 replacement is annoying but not ruinous) or <b>credit-card balance insurance</b> (designed to protect the bank, not you). A good rule of thumb: insure the rare catastrophic loss, self-insure the frequent small loss. The premiums match this logic — catastrophic insurance is relatively cheap because claims are rare; routine coverage is expensive because claims are frequent.' },
    { type: 'keyterm', term: 'Risk pooling', definition: 'Many policyholders pay small premiums; the insurer pays out to the few who actually suffer losses. The law of large numbers makes the total payouts predictable, even though individual events are random.' },
    {
      type: 'scenario',
      title: 'When to insure',
      prompt: 'Three risks, same expected annual cost of €500. Which one is worth insuring?',
      choices: [
        { label: 'Losing a €500 phone (10% chance, €5,000 loss)', outcome: 'Nice-to-have but survivable without insurance — you can absorb €5k.' },
        { label: '1% chance of €50,000 hospital bill',            outcome: 'Core insurance case. Low probability, catastrophic impact.', correct: true },
        { label: '50% chance of a €1,000 scratch on your car',    outcome: 'Too frequent. Insurance for routine losses is just prepayment with admin fees.' },
      ],
    },
  ],

  'f0-m7-l2': [
    { type: 'heading', level: 2, content: 'Types You Actually Need' },
    { type: 'text', content: 'The insurance industry sells dozens of products, but only a handful of them are genuinely essential for a typical adult. The rest are either redundant with something you already have, priced against you (meaning you pay more than the expected payout), or outright gimmicks. Learning to distinguish between the two categories will save you more money than almost any other financial habit, because insurance mistakes are quiet: nobody tells you that you are overpaying, and the overpayment compounds for decades.' },
    { type: 'text', content: 'The truly essential categories cover risks that could financially ruin you. <b>Health insurance</b> is at the top of the list in every country, including those with strong public systems — a complementary mutuelle in France or a private top-up in the UK can be the difference between routine care and years of waiting lists or uncovered costs. <b>Liability insurance</b> (<i>responsabilité civile</i>) is required by law in most EU countries and is absurdly cheap relative to the protection it provides; it shields you from being sued into bankruptcy if you accidentally injure someone or damage their property. <b>Home insurance</b> — whether you rent or own — covers the biggest physical asset in your life and the household items inside it.' },
    { type: 'text', content: 'If you have <b>financial dependants</b> (children, a stay-at-home partner, elderly parents you support), term life insurance becomes essential. It is cheap — €20–€50/month for a healthy adult buying €300k of coverage — and it exists for exactly one purpose: if you die unexpectedly, your dependants can maintain their lifestyle until they are independent. <b>Disability income insurance</b>, often overlooked, is arguably more valuable than life insurance for working-age adults: you are statistically much more likely to become unable to work than to die suddenly, and the financial consequences are similar.' },
    { type: 'text', content: 'The products worth avoiding are almost always characterised by one of three flaws: the expected payout is much lower than the premiums, the coverage duplicates something you already have, or the product is deliberately complex to hide poor economics. Extended warranties on consumer goods, credit-card balance protection, single-trip travel insurance for short domestic trips, mortgage life insurance sold bundled with a bank loan, and "whole life" or "universal life" insurance products pitched as investments are all classic examples. When in doubt, read the terms: if the policy defines its own value in page after page of exclusions, you are almost certainly the product.' },
    {
      type: 'microcard',
      title: 'The essentials',
      cards: [
        { front: 'Health',           back: 'In most EU countries, partly covered by public systems. A top-up mutuelle/complémentaire fills the gaps.' },
        { front: 'Liability',        back: 'Responsabilité civile. Covers you if you injure someone or damage their property. Cheap and essential.' },
        { front: 'Home (renter or owner)', back: 'Fire, theft, water damage. Usually required by landlords/banks.' },
        { front: 'Auto (if you drive)', back: 'Third-party liability is legally required in every EU country. Comprehensive adds own-damage coverage.' },
        { front: 'Term life (if dependants)', back: 'Cheap, pure death benefit. Only buy if someone else depends on your income.' },
        { front: 'Disability income', back: 'Often overlooked. Replaces income if you can\'t work — statistically more likely than premature death.' },
      ],
    },
    { type: 'callout', variant: 'warning', title: 'Avoid these', content: 'Extended warranties, credit-card balance insurance, mortgage life insurance bundled with a bank loan, travel insurance on a €200 trip. Premium economics don\'t work in your favour.' },
  ],

  'f0-m7-l3': [
    { type: 'heading', level: 2, content: 'Self-Insure vs. Transfer Risk' },
    { type: 'text', content: 'When people hear "self-insure", they often assume it means going without coverage — flying naked, gambling with fate. That is not what the term means in financial planning. <b>Self-insurance is a deliberate decision to carry a specific risk yourself because your savings can absorb the worst plausible outcome.</b> It is an active choice, made with numbers, and it usually leaves you better off than buying the equivalent insurance policy — because the insurer\'s price necessarily includes their profit margin, their administration costs, their marketing budget, and a cushion for adverse outcomes.' },
    { type: 'text', content: 'The decision framework has two questions. First: <b>how bad is the worst-case loss?</b> If the maximum possible loss would ruin you — bankrupt, homeless, unable to pay medical bills — you cannot self-insure that risk. This category includes major illness, professional liability, severe disability, and the total loss of your home. Second: <b>how often does the loss actually happen, and how much would the total lifetime premium cost?</b> If the event is small, moderately frequent, and the cumulative premiums would approach or exceed the cost of paying out-of-pocket, self-insuring is mathematically superior.' },
    { type: 'text', content: 'The classic example is <b>pet insurance</b>. A typical policy for a cat or dog costs €40–€80 per month with deductibles and exclusions. Over the animal\'s 12–15 year life, premiums add up to around €8,000–€12,000. The realistic average lifetime vet spend for a pet, assuming no catastrophic event, is more like €4,000–€6,000. In other words, you are on average paying more in premiums than you would pay in vet bills. Self-insurance here means setting up a dedicated savings pot, funding it with the same €50–€80 a month you would have paid as premium, and using it to cover vet bills as they arise. The math usually works out hugely in your favour — and any unused balance stays in your pocket.' },
    { type: 'text', content: 'The same logic applies to <b>small deductibles</b> on auto and home policies (raise the deductible to reduce the premium and self-insure the gap), <b>extended warranties</b> on appliances (never buy; a spare fund of €500 covers almost any single appliance failure), and <b>mobile-phone insurance</b> (almost always structurally unprofitable for the consumer). The one hard rule: self-insurance only works if you <b>actually save the money</b> in a dedicated, rule-fenced account. "I\'ll just pay from general savings if something breaks" is not self-insurance — it is hoping. The discipline of the sinking fund is what makes the model work.' },
    {
      type: 'casetree',
      title: 'Case: The vet-bill dilemma',
      tree: {
        root: 'start',
        nodes: {
          start: {
            text: 'Maya has 2 cats. Pet insurance costs €600/yr with a €100 deductible. Average lifetime vet costs for 2 cats: ~€4,000 over 15 years.',
            choices: [
              { label: 'Buy the insurance',                next: 'insured',   score: 0 },
              { label: 'Self-insure (save €50/mo in a pet fund)', next: 'selfInsured', score: 3 },
              { label: 'Ignore the risk entirely',          next: 'ignore',   score: -3 },
            ],
          },
          insured: {
            text: 'Maya pays €9,000 in premiums over 15 years for €4,000 of expected losses. Nothing catastrophic happens.',
            terminal: true,
            verdict: 'Insurance "worked" but was expensive. Reasonable if you can\'t stomach variance.',
          },
          selfInsured: {
            text: 'Maya saves €50/mo. After 15 years, she has paid in ~€9,000 + interest but only spent ~€4,000 on vet bills. Net gain: ~€5,000.',
            terminal: true,
            verdict: 'Textbook self-insurance: you kept the insurer\'s profit margin. Only works if you discipline the savings.',
          },
          ignore: {
            text: 'Maya sets nothing aside. Year 8: sudden €3,000 surgery. She goes into credit-card debt.',
            terminal: true,
            verdict: 'The bad outcome. No plan is worse than either insurance or self-insurance.',
          },
        },
      },
    },
  ],

  // ══════════════════════════════════════════════════════════════
  //  MODULE 8 — Retirement & Long-term Planning
  // ══════════════════════════════════════════════════════════════

  'f0-m8-l1': [
    { type: 'heading', level: 2, content: 'Time Value of Money' },
    { type: 'text', content: 'The <b>time value of money</b> is the most fundamental concept in all of finance. Pick any valuation technique — discounted cash flow, mortgage pricing, bond yields, pension calculations, stock price models, even the decision to pay upfront or in installments — and underneath it is the same simple idea: <b>a euro today is worth more than a euro promised for tomorrow, because the euro today can be invested and earn a return</b>. Every other financial concept in this module builds on that sentence.' },
    { type: 'text', content: 'The mathematical tools are called <b>future value</b> (FV) and <b>present value</b> (PV). Future value answers: if I invest this euro today at rate r for t years, what will it grow to? The answer is PV × (1 + r)^t. Present value works backwards: if I am promised a euro t years from now, what is that promise worth today? The answer is FV ÷ (1 + r)^t. These two formulas, applied with care, are behind almost every price in capital markets.' },
    { type: 'text', content: 'The practical implications are enormous, especially for retirement planning. Consider two people, Anna and Ben, both planning to retire at 65. Anna starts saving €200/month at age 25. Ben waits until age 35 to start but saves €200/month for 30 years. Both contribute for most of their careers. At a 7% real return, Anna ends with roughly €525,000; Ben ends with roughly €245,000 — less than half. Anna contributed €96,000 of her own money. Ben contributed €72,000. A mere 25% difference in contribution became a more than 2× difference in outcome. The explanation is simply that Anna\'s early euros compounded for 10 more years — and those final years are when the curve is steepest.' },
    { type: 'text', content: 'This is the single most important reason to start investing young, even in amounts that feel trivially small. €50 a month in a cheap index fund, started at 22 and continued through retirement, will outperform €500 a month started at 45. The arithmetic is indifferent to effort or sophistication — it rewards time. The corollary for older readers is equally important: if you are 40 or 50 and have not started, the worst possible response is "it\'s too late, so why bother?" Every year you delay costs you 10–15% of the final outcome. Start now, with whatever you can, and never stop.' },
    {
      type: 'calculator',
      title: 'Future value calculator',
      calculator: 'compound',
    },
    {
      type: 'datasight',
      title: 'DataSight: Start early, win big',
      chartSpec:
`Scenario: invest €200/mo at 7 % real return. Retire at 65.

Starts at age 25:  Total contribution: €96,000  →  Nest egg: ≈ €505 000
Starts at age 35:  Total contribution: €72,000  →  Nest egg: ≈ €244 000
Starts at age 45:  Total contribution: €48,000  →  Nest egg: ≈ €106 000`,
      prompt: 'What does this table show most dramatically?',
      options: ['Older investors earn more', 'The value of starting early — a 10-year delay halves the final portfolio', 'Contributions don\'t matter', 'Interest rates are random'],
      correctIndex: 1,
      explanation: 'Time in the market is the single biggest lever. A 10-year head start on the same monthly contribution more than doubles the end result.',
    },
  ],

  'f0-m8-l2': [
    { type: 'heading', level: 2, content: 'Retirement Accounts Across the EU' },
    { type: 'text', content: 'European retirement systems are built on three layers, called "pillars". The <b>first pillar</b> is the state pension — funded by mandatory social contributions and paid to all eligible retirees, with benefits calculated from your earnings history. This pillar alone is rarely enough to maintain living standards in retirement, especially as populations age and replacement rates fall. The <b>second pillar</b> is workplace pensions — set up by employers, often with mandatory or matched contributions, especially common in the Netherlands, the UK, and Scandinavia. The <b>third pillar</b> is voluntary personal savings inside tax-advantaged wrappers — and this is the pillar where you, as an individual, have the most leverage.' },
    { type: 'text', content: 'Every EU country has its own third-pillar tax wrappers, and they are wildly different. In France, the <b>PER (Plan Épargne Retraite)</b> lets you deduct contributions from taxable income (up to a cap) in exchange for locking the funds until retirement — ideal for high earners in the 41–45% brackets. Also in France, the <b>PEA (Plan d\'Épargne en Actions)</b> is a stock-wrapper capped at €150,000; after five years, gains and dividends are taxed at a favourable 17.2% (social charges only) rather than the standard 30% PFU. In the UK, the <b>ISA</b> is one of the best deals in global finance: £20,000 per year, fully tax-free on all gains and withdrawals, with no lock-in. UK workers also have <b>SIPP</b>s for deeper pension tax relief.' },
    { type: 'text', content: 'The German system combines the <b>Riester-Rente</b> (government-subsidised contributions plus deductions, locked until retirement) with the basic <b>Depot</b> investment account and workplace <b>bAV</b> (betriebliche Altersvorsorge). The Dutch second-pillar scheme is mandatory and world-class — most employees automatically participate in collective funds with very low fees. Italy\'s <b>Fondi Pensione</b> offer deductible contributions. Spain\'s <b>Planes de Pensiones</b> have tightened the annual contribution limit but still offer full deductibility. The point is not to memorise them all — it is to understand that in every country, <b>there is almost certainly a tax-advantaged wrapper you should be using before a regular brokerage account</b>.' },
    { type: 'text', content: 'The general hierarchy for allocating savings goes: (1) <b>capture any employer pension match</b> — this is literally free money and should never be left on the table; (2) <b>max out your high-flexibility tax-free wrapper</b> (ISA in the UK, PEA in France); (3) <b>contribute to your pension</b> up to the threshold where you get the best tax relief on contributions (41–45% bracket in France, higher-rate band in the UK); (4) <b>invest any remainder in a regular taxable brokerage account</b>. For a typical middle-income earner in their 30s, simply doing steps 1 and 2 consistently already puts you in the top 10% of retirement preparedness for your country.' },
    {
      type: 'microcard',
      title: 'The big EU/UK tax wrappers',
      cards: [
        { front: 'France: PER (Plan Épargne Retraite)', back: 'Contributions deductible from income tax (up to a cap). Locked until retirement. Taxed at withdrawal.' },
        { front: 'France: PEA',        back: 'Stock savings plan. 5+ year lock unlocks 17.2% flat tax rate on gains (vs. 30% PFU). Capped at €150k.' },
        { front: 'UK: ISA (Individual Savings Account)', back: '£20k/yr tax-free wrapper. Gains, dividends, interest all tax-free. One of the best deals in developed finance.' },
        { front: 'UK: SIPP / pension',  back: 'Tax relief on contributions at your marginal rate. Locked until 57. 25% tax-free at withdrawal.' },
        { front: 'Germany: Riester-Rente', back: 'Government top-up contributions + tax deductions. Locked until retirement.' },
        { front: 'Netherlands: pension pillar II', back: 'Mandatory employer pension scheme — generally high-quality collective plans.' },
      ],
    },
    { type: 'callout', variant: 'tip', title: 'Priority order', content: 'In most EU countries, the rule of thumb is: (1) capture any employer match, (2) max your tax-advantaged ISA/PEA, (3) max pension for the tax relief, (4) then taxable accounts.' },
  ],

  'f0-m8-l3': [
    { type: 'heading', level: 2, content: 'Setting Long-term Goals' },
    { type: 'text', content: 'There is no single "retirement number" that applies to everyone — and anyone claiming otherwise is selling a simplification. Your number depends on four inputs, each of which you need to estimate with some honesty: <b>when you want to retire</b>, <b>how much you will actually spend per year in today\'s money</b>, <b>what inflation will do</b> between now and then, and <b>what real return your portfolio will earn</b>. Change any of those inputs meaningfully and the target shifts. But once you fix them, the arithmetic is straightforward.' },
    { type: 'text', content: 'The most widely cited rule of thumb is the <b>4% safe withdrawal rate</b>, originally derived from the 1998 Trinity Study analysing US historical returns. The rule says: take your annual desired retirement spending and multiply by 25 — that is roughly the portfolio size you need. If you want €40,000/year in retirement spending, you need about €1,000,000 invested. The logic is that a balanced stock/bond portfolio can sustainably support withdrawals at 4% per year, inflation-adjusted, for 30 years — through historical crises, wars, and inflation spikes. It is not a guarantee. It is a useful anchor.' },
    { type: 'text', content: 'European investors should probably use a slightly lower withdrawal rate — perhaps 3.5% or even 3.25% — for two reasons. First, European equity markets have historically returned less than the US markets the Trinity Study used. Second, lifespans are getting longer, and funding 35 or even 40 years of retirement is now plausible. Using 3.5% means your target number is closer to 28× annual spending (€1.14M for €40k/year). Using 3.25% pushes it to 31× (€1.24M for €40k/year). The conservative end of this range is what increasingly sophisticated retirement planners are recommending.' },
    { type: 'text', content: 'The behavioural lesson is that the big number is less scary than it sounds, because compounding does most of the work. A 25-year-old saving €500 a month at a 6% real return will reach €1M by age 58 without heroic sacrifice. A 35-year-old needs to save about €1,000 a month to reach the same milestone by 60. A 45-year-old needs roughly €2,200 a month. Start earlier, finish easier. The real skill is not calculating the number precisely — it is setting up the automatic monthly transfer and then forgetting it exists for two decades while it quietly compounds into something big enough to change your life.' },
    {
      type: 'scenario',
      title: 'The 4% rule',
      prompt: 'You want €40,000/year in retirement spending. Using the 4% safe-withdrawal rule, what portfolio size do you need?',
      choices: [
        { label: '€400,000',  outcome: '€400k × 4% = €16k/yr. Not enough.' },
        { label: '€1,000,000', outcome: 'Correct. €1M × 4% = €40k/yr — the rough number for 30 years of safe withdrawals.', correct: true },
        { label: '€10,000,000', outcome: 'Overshot by 10×.' },
      ],
    },
    { type: 'callout', variant: 'example', title: 'Trinity-study caveats', content: 'The 4% rule came from the 1998 "Trinity Study" on US stocks/bonds. EU investors should probably use 3.5–3.75% to account for higher expense ratios and lower historical returns in some eurozone markets.' },
  ],

  // ══════════════════════════════════════════════════════════════
  //  MODULE 9 — Taxes & Government Money
  // ══════════════════════════════════════════════════════════════

  'f0-m9-l1': [
    { type: 'heading', level: 2, content: 'Why Taxes Exist' },
    { type: 'text', content: 'Oliver Wendell Holmes, a US Supreme Court justice, put it memorably in 1927: "Taxes are what we pay for civilised society." It is worth pausing on this, because modern tax debate tends to frame the question as whether taxes should be higher or lower — and skips over the prior question of why they exist at all. The answer, supported by two thousand years of evidence, is that certain valuable things (roads, police forces, public health systems, courts, a functioning currency, national defence, basic education) cannot be efficiently provided by markets. They are <b>public goods</b>: non-excludable, non-rival, and essential.' },
    { type: 'text', content: 'Without taxation, these services would chronically be under-provided, because no individual would choose to pay for them voluntarily when they could free-ride on others\' contributions. Economists call this the <b>collective action problem</b>, and the solution every successful society has converged on is compulsory taxation. The taxpayer gives up some personal control over resources; in return, the state provides services that make the taxpayer\'s own economic life possible — clean water, enforceable contracts, an educated workforce, a court to sue in, a road to drive on.' },
    { type: 'text', content: 'Where taxes in European countries actually go is often surprising. Contrary to popular perception, defence and debt service together typically account for less than 20% of government spending. The dominant line item is <b>social protection</b> — pensions, unemployment benefits, family allowances, disability benefits — which consumes 35–45% of the budget in most EU countries. Health spending adds another 12–16%. Education takes about 10%. These proportions reflect the European social contract: an implicit insurance pool where working-age taxpayers fund retirees, the unemployed, and the young, with the understanding that they will in turn be supported when their own time comes.' },
    { type: 'text', content: 'Understanding this flow matters for any serious financial planning because it changes the way you think about taxation. A 22% social contribution on your salary is not "stolen money" — it is the premium on a mandatory collective insurance policy covering your future pension, your own healthcare, and your backup if you lose your job. A 30% flat tax on investment gains funds a state that protects the property rights that make investment possible in the first place. None of this means the rate or structure is optimal, or that spending is always well-managed. But the existence of tax is the price of the scaffolding that allows private wealth to be built at all.' },
    {
      type: 'datasight',
      title: 'DataSight: Where €100 of tax goes (EU avg.)',
      chartSpec:
`Social protection (pensions, healthcare, unemployment):  42 €
Education:                                               10 €
General public services + debt service:                  14 €
Health (public):                                         14 €
Defence + public order (police, courts):                 10 €
Economic affairs (infra, R&D):                           7 €
Environment + housing + culture:                         3 €`,
      prompt: 'Which single line consumes the most tax euros in the typical EU country?',
      options: ['Defence', 'Social protection (pensions, unemployment, healthcare)', 'Education', 'Public debt interest'],
      correctIndex: 1,
      explanation: 'In almost every EU country, social protection dominates — 35–45% of public spending. This is the welfare-state model.',
    },
  ],

  'f0-m9-l2': [
    { type: 'heading', level: 2, content: 'Income, VAT, Property — The Big Three' },
    { type: 'text', content: 'Modern EU states raise revenue from dozens of individual taxes, but three pillars dominate the tax take in almost every country. <b>Income tax</b> (progressive or flat, depending on country), <b>value-added tax (VAT)</b> applied to almost everything you buy, and <b>property tax</b> assessed annually on real estate. Together with social contributions, these four categories account for roughly 85% of total tax revenue in the typical EU member state.' },
    { type: 'text', content: '<b>Income tax</b> is the most visible because you file a return every year, but it is usually not the biggest line item in your total tax bill. In France the marginal brackets run from 0% up to 45% (plus an exceptional contribution for top earners), withheld at source as PAYE since 2019. In Germany rates run from 14% to 45%. In Italy from 23% to 43%. In Spain from 19% to 47%. The progressive structure means that for most middle-income earners the effective rate is much lower than the marginal rate — a €50,000 earner in France pays perhaps 13% effective, not 30% marginal.' },
    { type: 'text', content: '<b>VAT</b> is stealthier. It is baked into the price you see at the till, which is why most consumers never notice it. Standard rates are 20% in France, 19% in Germany, 21% in Spain, 22% in Italy, 25% in Sweden and Denmark. Reduced rates apply to groceries, books, and some services. Because VAT is levied on spending rather than income, it is <b>regressive</b> — low-income households spend a higher proportion of their earnings and therefore pay a higher share of income in VAT than wealthy households who save more. This is why every country pairs VAT with redistributive benefits.' },
    { type: 'text', content: '<b>Property tax and capital-gains tax</b> round out the big three from the citizen\'s perspective. Most EU countries levy an annual tax on the assessed value of real estate (<i>taxe foncière</i> in France, <i>Grundsteuer</i> in Germany, council tax in the UK). Separate transfer taxes apply when you buy a property. Capital gains on investments are typically taxed at a flat rate — France\'s 30% PFU, Germany\'s 26.375% Abgeltungsteuer, the UK\'s CGT at up to 24% — often lower than top-marginal income tax, which is the structural reason capital compounds faster than wages. Knowing the rate schedule for your country, across these three pillars, is the precondition for any serious tax planning.' },
    {
      type: 'microcard',
      title: 'Three revenue pillars',
      cards: [
        { front: 'Income tax',   back: 'Progressive in most EU countries. Marginal rates up to 45–55% at the top. Usually withheld at source (PAYE).' },
        { front: 'VAT',          back: 'Consumption tax, built into prices. Standard EU rates 17–27%. Regressive (hurts low incomes more as a %).' },
        { front: 'Social contributions', back: 'Often the biggest chunk — 20–40% of gross salary, split between employer and employee. Funds pensions and health.' },
        { front: 'Property tax', back: 'Annual tax on assessed property value. Typically 0.5–2% depending on country.' },
        { front: 'Capital gains / dividends', back: 'In many EU countries, a flat rate (France PFU 30%, Germany 26.375%) lower than top-marginal income tax.' },
      ],
    },
  ],

  'f0-m9-l3': [
    { type: 'heading', level: 2, content: 'Tax-Advantaged Accounts' },
    { type: 'text', content: 'There is an important distinction that trips up a lot of people: <b>tax avoidance</b> is legal and deliberately built into every tax code in the world, while <b>tax evasion</b> is illegal and criminal. The former is using the rules as written to reduce your tax bill — putting money into a PEA, claiming a mortgage-interest deduction, taking a pension contribution. The latter is lying on your return. Tax-advantaged accounts live firmly in the legal category. They are not loopholes being closed next year; they are explicit policy instruments that governments use to encourage specific behaviours.' },
    { type: 'text', content: 'Governments use tax wrappers to <b>steer behaviour</b> they want more of. They want citizens to save for retirement (so old age is not purely a public-finance problem), so they offer pension accounts with income-tax deductions or tax-free growth. They want investment in domestic equity markets (to fund productive companies), so they offer equity wrappers like the French PEA or Italy\'s PIR. They want home ownership, so in many countries mortgage interest is partially deductible. Each wrapper comes with strings attached — a contribution cap, a lock-in period, an investment restriction — and the strings are the price of the tax advantage.' },
    { type: 'text', content: 'The financial impact is huge over a lifetime. Consider a French earner in the 30% tax bracket who invests €10,000/year for 30 years at a 7% real return. In a regular taxable account, the gains are taxed at 30% along the way, which drags the effective return down to roughly 4.9% after tax. Ending balance: about €650,000. In a PEA where gains are taxed at only 17.2% after five years, the after-tax return is roughly 5.8%. Ending balance: about €775,000. That is €125,000 of pure tax-wrapper advantage — the same investments, the same risk, the same time horizon, just a different legal envelope.' },
    { type: 'text', content: 'The practical hierarchy for allocating savings almost always runs: (1) <b>capture the employer pension match</b> — it is a 50–100% instant return, the highest ROI available anywhere; (2) <b>fill your flexible tax-advantaged wrapper</b> (PEA, ISA, depending on country) — tax-free growth with minimal lock-in; (3) <b>contribute to a deeper pension wrapper</b> (PER, SIPP) for the income-tax deduction; (4) <b>anything extra goes into a standard taxable brokerage</b>. Following this order, in almost every case, beats every clever investment choice you could make. The wrapper decision matters more than the stock-picking decision.' },
    {
      type: 'scenario',
      title: 'Wrapper priority',
      prompt: 'You earn €60k, live in France, and have €10,000 to invest annually. Where should it go first?',
      choices: [
        { label: 'Regular brokerage account — maximum flexibility',          outcome: 'Flexible but you\'ll pay 30% PFU on all gains. You\'re leaving tax savings on the table.' },
        { label: 'PEA first (up to €150k lifetime, 17.2% after 5 yrs), then PER, then brokerage', outcome: 'Correct. Use wrappers in order of tax advantage. PEA alone saves ~13% on every euro of gain vs. taxable.', correct: true },
        { label: 'All into PER for the immediate tax deduction',              outcome: 'PER is good but locked until retirement. Hybrid is usually better.' },
      ],
    },
  ],

  // ══════════════════════════════════════════════════════════════
  //  MODULE 10 — Scams & Consumer Protection
  // ══════════════════════════════════════════════════════════════

  'f0-m10-l1': [
    { type: 'heading', level: 2, content: 'Phishing, Pyramid & Ponzi Schemes' },
    { type: 'text', content: 'The most destructive financial scams in history — Bernie Madoff\'s $65 billion Ponzi, Charles Ponzi\'s original 1920 scheme, Elizabeth Holmes\' Theranos, Herbalife\'s multi-level marketing empire — were not built by technical geniuses. They were built by <b>gifted salespeople</b>. Almost every scam in the wild uses the same half-dozen psychological triggers, wrapped around the same three or four structural patterns. Once you learn to recognise the shape, most scams become almost impossible to fall for — regardless of how slick the execution is.' },
    { type: 'text', content: '<b>Phishing</b> is the most common scam any normal person will encounter. The pattern is nearly identical every time: impersonation of a trusted entity (your bank, the tax authority, a delivery service, your email provider), combined with manufactured urgency ("your account will be suspended in 24 hours"), combined with a link that goes to a near-identical copy of the real site where you enter your credentials. More than 95% of corporate data breaches start with a successful phishing email. The defence is procedural, not technical: never click links in unsolicited messages, always open the app or website independently to verify anything, and treat urgency as a red flag rather than a call to action.' },
    { type: 'text', content: 'A <b>Ponzi scheme</b> is an investment fraud that pays returns to earlier investors not from any real profit but from the money contributed by later investors. Madoff did this for 40 years. The mathematics are fatal: because there is no real return, the scheme needs constant new inflows to pay old ones, and once those inflows slow — often during a market panic, when investors demand withdrawals — the whole thing collapses overnight. Red flags include consistently smooth returns regardless of market conditions (impossible in any legitimate strategy), difficulty withdrawing money, secretive investment methods, and unregistered advisers.' },
    { type: 'text', content: '<b>Pyramid schemes and most multi-level marketing (MLM)</b> businesses share the same core flaw. Revenue is paid not primarily from selling products to end consumers but from recruiting downstream participants, who pay an entry fee or buy starter inventory. The mathematical structure guarantees collapse: to keep paying the top layers, each new layer must be larger than the one above, which quickly exhausts the pool of potential recruits. Studies from the US FTC and the UK\'s trading standards consistently find that more than 99% of MLM participants lose money. The legitimate direct-sales business does exist, but the tell is always the same question: does the company make money from products sold to real end-customers, or from fees paid by new recruits?' },
    {
      type: 'microcard',
      title: 'The three canonical scams',
      cards: [
        { front: 'Phishing',         back: 'Impersonation + urgency. A fake email/SMS from "your bank" wants you to click a link and enter credentials. 95% of data breaches start here.' },
        { front: 'Ponzi scheme',     back: 'Pays old investors with new investor money, pretending to be "returns". Madoff ran one for 40 years, cost investors $65bn.' },
        { front: 'Pyramid / MLM',    back: 'Recruitment-based. You make money from recruiting downstream people, not from selling products. Always collapses — the math is fixed.' },
      ],
    },
    {
      type: 'scenario',
      title: 'Spot the scam',
      prompt: '"URGENT: Your bank account has been blocked due to suspicious activity. Click here within 24 hours to unblock: bit.ly/bnpparibas-verify"',
      choices: [
        { label: 'Click the link — it\'s from my bank',                outcome: 'Never. Banks don\'t send shortened URLs and won\'t ask you to re-enter credentials via email.' },
        { label: 'Open the bank app or website directly and check',    outcome: 'Correct. Always open the app/website independently to verify. If there\'s a real issue, it will show there.', correct: true },
        { label: 'Reply asking if it\'s real',                         outcome: 'Replying confirms your email is active and invites follow-ups.' },
      ],
    },
  ],

  'f0-m10-l2': [
    { type: 'heading', level: 2, content: 'Reading Financial Contracts' },
    { type: 'text', content: 'Almost no one reads the terms and conditions of their financial products. Studies suggest fewer than one in a thousand customers actually open the PDF, and of those who do, even fewer make it to the end. This is not a personal failing — the documents are deliberately long, dense, and legalistic. But there is good news: you do not need to read the whole contract to protect yourself from bad deals. Every financial product has the <b>same three dangerous sections</b>, and reading only those three is enough to catch 90% of the traps.' },
    { type: 'text', content: 'The first section to scrutinise is <b>fees</b>. Financial products bury fees in layers: a nominal headline fee that looks reasonable, plus an entry fee, plus an annual management fee, plus a performance fee, plus transaction fees embedded in spreads, plus exit fees, plus taxes on top of everything. A product that advertises "2% per year" may in reality cost 4% per year all-in once you add every layer. The right question is not "what\'s the management fee?" but "what is the <b>total expense ratio (TER)</b>?" or "what is the <b>all-in annual cost</b>?" Ask the adviser or product manager this question in writing. The answer, and their willingness to give it straight, tells you a lot.' },
    { type: 'text', content: 'The second section is <b>penalties and lock-ups</b>. Life insurance contracts often impose sliding-scale early exit penalties for 5–8 years. Pension products lock money until retirement age, sometimes with stiff penalties for earlier withdrawal even in hardship. Structured products can impose 100% loss of capital if held for less than the full term. None of these are necessarily bad — a lock-up is often the price of a tax advantage or a higher yield — but you need to <b>know about them before you sign</b>. The contract tells you exactly what happens if your life circumstances change in year 3 and you need the money back. Read that clause.' },
    { type: 'text', content: 'The third section is <b>the risk disclosures</b>. Look for phrases like "principal is not guaranteed" (you can lose everything), "past performance does not guarantee future results" (usually honest, but the backtest was probably cherry-picked), "this product is complex" (it is — even the regulator is suspicious), and "subject to counterparty risk" (if the issuer goes bust, your product may be worthless regardless of the underlying). A clean product\'s risks are disclosed plainly. A problematic one buries them in dense legalese on page 47. If you cannot, after 15 minutes of reading, summarise in one paragraph what the product does and what can go wrong, the honest move is to not buy it — regardless of what the salesperson tells you.' },
    {
      type: 'microcard',
      title: 'Red-flag phrases',
      cards: [
        { front: '"Principal is not guaranteed"', back: 'Plain English: you can lose your entire investment. Common in structured products.' },
        { front: '"Lock-up period"',              back: 'You can\'t get your money out for a set time. Critical to notice.' },
        { front: '"Performance fee 20% above hurdle"', back: 'You pay extra if the product does well. Check the hurdle — sometimes it\'s absurdly low.' },
        { front: '"Early termination penalty"',   back: 'Cost to exit early. Can be 3–5% or even more on some life-insurance contracts.' },
        { front: '"Past performance does not guarantee future results"', back: 'Mandatory disclaimer, but pay attention — backtests are often cherry-picked.' },
      ],
    },
  ],

  'f0-m10-l3': [
    { type: 'heading', level: 2, content: 'Regulators & Consumer Rights' },
    { type: 'text', content: 'If you are scammed, mis-sold a product, or treated unfairly by a bank or broker in the European Union, you have substantially more rights than most consumers realise — and substantially more than in most other jurisdictions. The EU has spent the last thirty years building one of the strongest consumer-protection frameworks in the world, and it rests on two pillars: <b>directly enforceable rights written into EU law</b>, and <b>a multi-layered enforcement system</b> that offers free dispute resolution as an alternative to expensive court cases.' },
    { type: 'text', content: 'The regulator you deal with depends on the product. For <b>banking and payments</b>, each country has its own regulator — the <i>Autorité de Contrôle Prudentiel et de Résolution</i> (ACPR) in France, BaFin in Germany, the FCA in the UK, the Banca d\'Italia. For <b>investments and markets</b>, the regulators are the AMF (France), BaFin (Germany), the FCA (UK), CONSOB (Italy), ESMA at the EU level. They supervise licenced firms, investigate misconduct, maintain blacklists of unauthorised firms you can check before investing, and — critically — most of them publish warning lists of scam operators that are updated weekly. Checking this list before sending any money to an unfamiliar platform takes one minute and prevents a huge fraction of fraud losses.' },
    { type: 'text', content: 'The fastest and cheapest way to resolve a dispute with a financial firm is usually the <b>ombudsman</b> or equivalent free mediator. Every EU country has one. These bodies review complaints at no cost to the consumer, can order the firm to compensate up to tens of thousands of euros, and are binding on the firm in most cases. The UK\'s Financial Ombudsman Service resolves around 170,000 complaints a year, and consumers win in roughly 40% of cases. France\'s AMF Mediator has a 60%+ success rate for investors. Going through the ombudsman is always slower than direct negotiation with the bank and always faster than going to court — and it is free.' },
    { type: 'text', content: 'If you have been specifically scammed (identity fraud, phishing, unauthorised transactions), the fastest playbook is: <b>(1) freeze your card immediately</b> through the app; <b>(2) report the incident to the bank in writing within 24 hours</b>, which triggers PSD2 refund obligations; <b>(3) file a police complaint</b> — many chargebacks require this as evidence; <b>(4) report the scam itself</b> to your national regulator to help protect other consumers. Under PSD2, if you acted in good faith and reported quickly, your bank is legally obligated to refund unauthorised transactions beyond a €50 deductible. Many people do not know this and accept "sorry, nothing we can do" as an answer when legally it is not. The rights exist — using them is the job.' },
    {
      type: 'microcard',
      title: 'Who to call when things go wrong',
      cards: [
        { front: 'ECB (European Central Bank)', back: 'Supervises the largest EU banks. Rarely contacted by individuals — starts at your national regulator.' },
        { front: 'ESMA (European Securities and Markets Authority)', back: 'Oversees EU investment markets. Publishes warnings about unauthorised firms.' },
        { front: 'AMF (France)',        back: 'French markets regulator. Free complaint mediator service for investors.' },
        { front: 'BaFin (Germany)',     back: 'German equivalent. Handles both banking and markets.' },
        { front: 'FCA (UK)',            back: 'UK Financial Conduct Authority. Operates the Financial Ombudsman Service — free for consumers.' },
        { front: 'National ombudsman',   back: 'Every EU country has one — a free, non-binding alternative to court for financial disputes.' },
      ],
    },
    { type: 'callout', variant: 'tip', title: 'If you\'ve been scammed', content: '(1) Freeze cards immediately, (2) report to your bank within 24 hours, (3) file a police complaint (needed for chargebacks in many cases), (4) report the scam to your national regulator. Under PSD2, banks must refund unauthorised transactions up to €50 liability for you.' },
  ],
};
