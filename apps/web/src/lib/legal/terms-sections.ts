/** CeremonyWallet Terms and Conditions — source: repo root terms.txt */

import { SUPPORT_EMAIL } from "@/lib/site";

export type TermsSection = {
  title: string;
  paragraphs?: string[];
  list?: string[];
  subsections?: { title: string; paragraphs?: string[]; list?: string[] }[];
};

export const TERMS_META = {
  product: "CeremonyWallet",
  company: "Luak Holdings Limited",
  effectiveDate: "9 June 2026",
  lastUpdated: "9 June 2026",
  website: "https://ceremonywallet.com",
} as const;

export const TERMS_INTRO =
  'Please read these Terms and Conditions ("Terms", "Agreement") carefully before using CeremonyWallet ("Platform", "Service", "we", "us", "our"), a digital treasury and fundraising management platform owned and operated by Luak Holdings Limited, a company incorporated under the laws of Uganda. CeremonyWallet is designed for social events including weddings, introductions, condolences, fundraising tithe and offertories, and other community events. By accessing or using CeremonyWallet, you agree to be bound by these Terms. If you do not agree, you must discontinue use immediately.';

export const TERMS_SECTIONS: TermsSection[] = [
  {
    title: "1. Acceptance of Terms",
    paragraphs: [
      "By creating an account, accessing, or otherwise using the CeremonyWallet platform, you confirm that:",
    ],
    list: [
      "You have read, understood, and agree to be bound by these Terms and our Privacy Policy.",
      "You are at least 18 years of age, or have obtained verifiable parental or guardian consent.",
      "You have the legal capacity to enter into a binding agreement under Ugandan law and the laws of your jurisdiction.",
      "Your use of the Platform does not violate any applicable local, national, or international laws or regulations.",
    ],
  },
  {
    title: "2. Description of Service",
    paragraphs: [
      "CeremonyWallet is a digital treasurer platform that enables individuals and groups to:",
    ],
    list: [
      'Create and manage ceremony fundraising campaigns ("Ceremony Wallets") for events such as weddings, introductions, condolences, fundraising tithe and offertories, and other social occasions.',
      "Collect monetary contributions via Mobile Money (including MTN Mobile Money, Airtel Money, and other supported payment rails) and other integrated payment methods.",
      "Track pledges made by guests and contributors in real time.",
      "Monitor and report contributions transparently to all authorised stakeholders.",
      "Communicate updates and notifications to contributors, organisers, and guests.",
      "CeremonyWallet acts as a technology intermediary and facilitator only. We are not a bank, financial institution, payment processor, or regulated money services business. All payment processing is conducted through licensed third-party payment service providers.",
    ],
  },
  {
    title: "3. Account Registration and Eligibility",
    subsections: [
      {
        title: "3.1 Registration",
        paragraphs: [
          "To access the full functionality of CeremonyWallet, you must register for an account. You agree to:",
        ],
        list: [
          "Provide accurate, complete, and current information during registration.",
          "Maintain the accuracy of your registration information and update it promptly when it changes.",
          "Keep your account credentials (username, password, and any PIN or authentication codes) confidential and secure.",
          `Immediately notify us at ${SUPPORT_EMAIL} if you suspect any unauthorised access to your account.`,
        ],
      },
      {
        title: "3.2 Account Responsibility",
        paragraphs: [
          "You are solely responsible for all activities that occur under your account. CeremonyWallet shall not be liable for any loss or damage arising from your failure to maintain the security of your account credentials. You may not transfer, sell, or assign your account to any other person or entity without our prior written consent.",
        ],
      },
    ],
  },
  {
    title: "4. Ceremony Wallets and Fundraising Campaigns",
    subsections: [
      {
        title: "4.1 Creating a Ceremony Wallet",
        paragraphs: [
          'Event organisers ("Organisers") may create a Ceremony Wallet to collect contributions for a specific social event. By creating a Ceremony Wallet, the Organiser represents and warrants that:',
        ],
        list: [
          "The campaign is for a genuine social event as described on the Platform.",
          "All information provided about the ceremony is accurate and not misleading.",
          "Funds collected will be used solely for the stated purpose of the event.",
          "They have the authority to act on behalf of any group, family, or committee associated with the event.",
        ],
      },
      {
        title: "4.2 Contributions and Pledges",
        paragraphs: [
          "Contributors making payments or pledges through a Ceremony Wallet acknowledge that:",
        ],
        list: [
          "Contributions are voluntary and made at their own discretion.",
          "CeremonyWallet does not guarantee the fulfilment of pledges by third-party contributors.",
          "Contributions made through the Platform are subject to the terms of the applicable payment service provider.",
          "Once a contribution is processed, it may be subject to the refund policy set by the Organiser and our own refund terms below.",
        ],
      },
      {
        title: "4.3 Organiser Obligations",
        paragraphs: [
          "Organisers are responsible for managing their Ceremony Wallets responsibly and transparently, communicating with contributors regarding the status of the event, and ensuring that collected funds are applied to the stated event purpose. CeremonyWallet reserves the right to suspend or terminate any Ceremony Wallet that we reasonably believe is being used fraudulently, deceptively, or in violation of these Terms.",
        ],
      },
    ],
  },
  {
    title: "5. Mobile Money and Payment Processing",
    subsections: [
      {
        title: "5.1 Third-Party Payment Providers",
        paragraphs: [
          'All financial transactions facilitated through CeremonyWallet are processed by licensed third-party Mobile Money operators and payment processors ("Payment Providers"), including but not limited to MTN Mobile Money Uganda, Airtel Money Uganda, and other supported providers. By making or receiving payments through the Platform, you agree to comply with the terms and conditions of the applicable Payment Provider.',
        ],
      },
      {
        title: "5.2 Transaction Fees and Charges",
        paragraphs: [
          "CeremonyWallet, operated by Luak Holdings Limited, applies various charges in connection with use of the Platform. By using CeremonyWallet, you expressly acknowledge and agree to all charges applicable to your account and transactions, including:",
        ],
        list: [
          "Platform service fees charged on contributions collected through a Ceremony Wallet, at the rates published on the Platform from time to time.",
          "Mobile Money transaction fees levied by MTN Mobile Money Uganda, Airtel Money Uganda, or any other Payment Provider used to process your payment.",
          "Withdrawal and disbursement fees applicable when funds are transferred from a Ceremony Wallet to the Organiser's designated account.",
          "Any applicable taxes, levies, or government-mandated charges, including but not limited to Value Added Tax (VAT) as required under Ugandan law.",
          "Currency conversion or cross-network charges where applicable.",
          "All charges are non-negotiable and non-refundable except as expressly stated in these Terms. Luak Holdings Limited reserves the right to revise its fee schedule at any time. Updated fees will be published on the Platform and will take effect from the date of publication. Your continued use of the Platform after any fee revision constitutes your acceptance of the revised charges. You are responsible for reviewing the current fee schedule before initiating any transaction.",
        ],
      },
      {
        title: "5.3 Transaction Accuracy",
        paragraphs: [
          "You are responsible for ensuring the accuracy of all payment details you submit, including mobile money numbers, amounts, and recipient information. CeremonyWallet shall not be liable for any losses arising from incorrect information provided by you. In the event of a failed transaction, please contact your Payment Provider as well as our support team.",
        ],
      },
      {
        title: "5.4 Funds Disbursement",
        paragraphs: [
          "Funds collected in a Ceremony Wallet will be made available for withdrawal by the authorised Organiser in accordance with our disbursement schedule and procedures in force at the time. We reserve the right to delay disbursement pending verification, fraud review, or compliance checks.",
        ],
      },
    ],
  },
  {
    title: "6. Refunds and Cancellations",
    paragraphs: [
      "Due to the nature of social event fundraising, contributions made through CeremonyWallet are generally non-refundable once processed. However:",
    ],
    list: [
      "If a ceremony is cancelled by the Organiser, the Organiser is responsible for communicating with contributors and making arrangements for refunds directly.",
      "CeremonyWallet may, at its sole discretion, facilitate refunds in cases of proven fraud, duplicate transactions, or technical errors.",
      `All refund requests must be submitted in writing to ${SUPPORT_EMAIL} within 14 days of the original transaction.`,
      "Refunds, where approved, will be processed within 7–14 business days and are subject to any applicable Payment Provider reversal fees.",
    ],
  },
  {
    title: "7. Prohibited Uses",
    paragraphs: ["You agree that you will not use CeremonyWallet to:"],
    list: [
      "Conduct fraud, money laundering, or any other illegal financial activity.",
      "Create false, misleading, or deceptive Ceremony Wallets or campaigns.",
      "Collect contributions for events or purposes not described in the campaign.",
      "Impersonate another person, organisation, or committee.",
      "Violate any applicable law, regulation, or third-party right, including intellectual property rights.",
      "Transmit spam, malware, or any harmful technical content to the Platform or other users.",
      "Attempt to gain unauthorised access to any part of the Platform, other user accounts, or our systems.",
      "Use automated tools, bots, or scrapers to access or extract data from the Platform without our express written consent.",
      "Violation of these prohibitions may result in immediate suspension or termination of your account and may be reported to relevant authorities, including the Uganda Communications Commission (UCC), Uganda Financial Intelligence Authority (FIA), and law enforcement agencies.",
    ],
  },
  {
    title: "8. Data Privacy and Protection",
    paragraphs: [
      "CeremonyWallet is committed to protecting your personal data in accordance with the Uganda Data Protection and Privacy Act, 2019 and all applicable data protection regulations. Our Privacy Policy, available at https://ceremonywallet.com/privacy, explains in detail how we collect, use, store, share, and protect your personal information. Key points include:",
    ],
    list: [
      "We collect personal information including your name, phone number, email address, and transaction data to provide the Service.",
      "Your data may be shared with Payment Providers and regulatory authorities as required by law.",
      "You have the right to access, correct, or request deletion of your personal data by contacting us at privacy@ceremonywallet.com.",
      "We implement reasonable technical and organisational measures to protect your data against unauthorised access, loss, or misuse.",
    ],
  },
  {
    title: "9. Intellectual Property",
    paragraphs: [
      'All content, trademarks, logos, software, and intellectual property on the CeremonyWallet Platform, including but not limited to the "CeremonyWallet" name and logo, are owned by or licensed to us and are protected under applicable intellectual property laws. You are granted a limited, non-exclusive, non-transferable, revocable licence to access and use the Platform solely for its intended personal, non-commercial purpose. You may not:',
    ],
    list: [
      "Copy, reproduce, distribute, or create derivative works from any Platform content without our express written permission.",
      "Use our trademarks, logos, or brand assets without prior written consent.",
      "Reverse-engineer, decompile, or otherwise attempt to extract the source code of any part of the Platform.",
    ],
  },
  {
    title: "10. Disclaimer of Warranties",
    paragraphs: [
      'THE CEREMONYWALLET PLATFORM IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS WITHOUT ANY WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, OR NON-INFRINGEMENT.',
      "We do not warrant that: (a) the Platform will be uninterrupted, error-free, or secure; (b) any defects will be corrected; (c) the Platform or the servers that make it available are free of viruses or other harmful components; or (d) the results of using the Platform will meet your requirements or expectations.",
    ],
  },
  {
    title: "11. Limitation of Liability",
    paragraphs: [
      "TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, CEREMONYWALLET, ITS DIRECTORS, OFFICERS, EMPLOYEES, AGENTS, AND PARTNERS SHALL NOT BE LIABLE FOR ANY:",
    ],
    list: [
      "Indirect, incidental, consequential, special, or punitive damages of any kind.",
      "Loss of profits, revenue, data, goodwill, or business opportunities.",
      "Losses arising from unauthorised access to or alteration of your data or transactions.",
      "Losses arising from actions or omissions of third-party Payment Providers.",
      "Damages arising from your reliance on information provided on the Platform.",
      "Our total cumulative liability to you for any claim arising out of or related to these Terms or your use of the Platform shall not exceed the total fees paid by you to CeremonyWallet in the twelve (12) months immediately preceding the event giving rise to the claim, or UGX 100,000 (One Hundred Thousand Uganda Shillings), whichever is lower.",
    ],
  },
  {
    title: "12. Indemnification",
    paragraphs: [
      "You agree to indemnify, defend, and hold harmless CeremonyWallet and its directors, officers, employees, agents, and partners from and against any and all claims, liabilities, damages, losses, costs, and expenses (including reasonable legal fees) arising out of or in connection with: (a) your use of or access to the Platform; (b) your violation of these Terms; (c) your violation of any applicable law or regulation; (d) your violation of any third-party rights; or (e) any dispute between you and another user of the Platform.",
    ],
  },
  {
    title: "13. Dispute Resolution",
    subsections: [
      {
        title: "13.1 Informal Resolution",
        paragraphs: [
          "In the event of any dispute, controversy, or claim arising out of or relating to these Terms or your use of the Platform, we encourage you to first contact us at legal@ceremonywallet.com and allow us 30 days to attempt an informal resolution before pursuing formal remedies.",
        ],
      },
      {
        title: "13.2 Governing Law",
        paragraphs: [
          "These Terms shall be governed by and construed in accordance with the laws of the Republic of Uganda, without regard to its conflict of law provisions.",
        ],
      },
      {
        title: "13.3 Jurisdiction",
        paragraphs: [
          "Any legal proceedings arising out of or relating to these Terms shall be subject to the exclusive jurisdiction of the courts of Uganda. You irrevocably consent to the personal jurisdiction of such courts.",
        ],
      },
    ],
  },
  {
    title: "14. Modifications to the Terms",
    paragraphs: [
      "CeremonyWallet reserves the right to modify, update, or replace these Terms at any time at our sole discretion. We will notify you of material changes by:",
    ],
    list: [
      'Posting the updated Terms on our website with a revised "Last Updated" date.',
      "Sending a notification to the email address or phone number associated with your account.",
      "Your continued use of the Platform after the effective date of any modifications constitutes your acceptance of the revised Terms. If you do not agree to the updated Terms, you must discontinue use of the Platform and close your account.",
    ],
  },
  {
    title: "15. Termination",
    paragraphs: [
      `CeremonyWallet may, at its sole discretion, suspend, restrict, or terminate your access to the Platform at any time without prior notice if we reasonably determine that you have breached these Terms, engaged in fraudulent activity, or if required to do so by applicable law or regulation. You may terminate your account at any time by contacting us at ${SUPPORT_EMAIL}. Termination does not relieve you of any obligations or liabilities incurred prior to termination. Sections 9, 10, 11, 12, 13, and 18 shall survive any termination of these Terms.`,
    ],
  },
  {
    title: "16. Platform Availability and Maintenance",
    paragraphs: [
      "We strive to maintain reliable and continuous availability of the CeremonyWallet Platform, but we do not guarantee uninterrupted access. The Platform may be temporarily unavailable due to scheduled or emergency maintenance, technical failures, force majeure events, or actions of third-party service providers. We will endeavour to provide advance notice of planned maintenance where reasonably practicable. CeremonyWallet shall not be liable for any losses resulting from Platform unavailability.",
    ],
  },
  {
    title: "17. User Conduct and Community Standards",
    paragraphs: [
      "CeremonyWallet is designed to serve communities celebrating important life events. We expect all users to interact with each other and the Platform respectfully and in good faith. You agree not to post, upload, or transmit content that is defamatory, abusive, harassing, threatening, obscene, or otherwise objectionable. We reserve the right to remove any content and suspend any account that violates these community standards.",
    ],
  },
  {
    title: "18. General Provisions",
    subsections: [
      {
        title: "18.1 Entire Agreement",
        paragraphs: [
          "These Terms, together with our Privacy Policy and any additional terms applicable to specific features of the Platform, constitute the entire agreement between you and CeremonyWallet with respect to your use of the Platform and supersede all prior agreements and understandings.",
        ],
      },
      {
        title: "18.2 Severability",
        paragraphs: [
          "If any provision of these Terms is found to be invalid, illegal, or unenforceable by a court of competent jurisdiction, that provision shall be modified to the minimum extent necessary to make it enforceable, or severed from these Terms, without affecting the validity and enforceability of the remaining provisions.",
        ],
      },
      {
        title: "18.3 Waiver",
        paragraphs: [
          "Our failure to enforce any right or provision of these Terms shall not constitute a waiver of such right or provision. Any waiver must be in writing and signed by an authorised representative of CeremonyWallet.",
        ],
      },
      {
        title: "18.4 Assignment",
        paragraphs: [
          "You may not assign or transfer any of your rights or obligations under these Terms without our prior written consent. We may freely assign or transfer these Terms in connection with a merger, acquisition, reorganisation, or sale of all or substantially all of our assets.",
        ],
      },
      {
        title: "18.5 Force Majeure",
        paragraphs: [
          "CeremonyWallet shall not be liable for any failure or delay in performance resulting from causes beyond our reasonable control, including but not limited to acts of God, natural disasters, civil unrest, government actions, telecommunications or internet failures, or actions of Mobile Money operators.",
        ],
      },
      {
        title: "18.6 Language",
        paragraphs: [
          "These Terms are written in the English language. In the event of any conflict between a translation and the English version, the English version shall prevail.",
        ],
      },
    ],
  },
  {
    title: "19. Contact Information",
    paragraphs: [
      "If you have any questions, concerns, or complaints regarding these Terms or the CeremonyWallet Platform, please contact us through any of the following channels:",
    ],
    list: [
      "CeremonyWallet",
      "Website: https://ceremonywallet.com",
      `General Support: ${SUPPORT_EMAIL}`,
      "Legal Matters: legal@ceremonywallet.com",
      "Privacy Inquiries: privacy@ceremonywallet.com",
    ],
  },
];

export const TERMS_CLOSING =
  "By using CeremonyWallet, you confirm that you have read, understood, and agree to these Terms and Conditions.";
