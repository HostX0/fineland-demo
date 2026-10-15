# Fineland by DevsHub

**A clear, focused demonstration of adaptive-behavior assessment workflow.** Fineland brings interview entry, scoring, follow-up comparison, and report preparation into one interactive clinic-style experience.

[Open the live demo](https://fineland-demo.vercel.app/) · [Request the full clinic system](https://github.com/HostX0/fineland-demo/issues/new?template=product-enquiry.yml) · [Meet the owner](https://github.com/HostX0)

> **Demonstration only:** Fineland is a frontend-only demo using fictional patient records and demonstration item wording. Do not enter real patient information or use its results to make clinical decisions.

## What you can explore

- Create a case and record intake details, including date of birth and interview date, to calculate chronological age.
- Enter item responses using the 0/1/2 scale or raw values, then review domain and adaptive behavior composite results.
- Explore basal and ceiling handling, interview routing, strengths and pairwise comparisons, and separate maladaptive and critical-item views.
- Compare follow-up assessments, search or archive cases, and prepare a printable report.
- Set clinic details and add a logo to see how clinic identity appears in the workflow and report.

Fineland demonstrates a workflow built around the **Vineland Adaptive Behavior Scales, Third Edition (Vineland-3), Comprehensive Interview Form**. It includes v-scale and domain scoring and the Adaptive Behavior Composite (ABC); the ABC excludes Motor. The reference interview route and a clinic age-cap workflow are shown as distinct concepts. Results include equivalent age and Growth Scale Value (GSV), not a growth rate.

The demo reflects scoring behavior implemented for this experience. That does not establish clinical validation, authorization to administer the instrument, or suitability for care decisions. Vineland-3 is a Pearson instrument; Fineland is an independent demonstration and is not endorsed by Pearson. See [Assessment and scoring notes](docs/ASSESSMENT.md).

## Start exploring

1. Open the [live demo](https://fineland-demo.vercel.app/).
2. Create a fictional case and follow the intake and interview flow.
3. Review scoring, follow-up comparison, and report options.
4. Use the demo's sample content only; browser data stays in local browser storage.

For a guided walkthrough, see the [User Guide](docs/USER-GUIDE.md). For the product overview, see [Product](docs/PRODUCT.md). Read the [Privacy and demo data](docs/PRIVACY.md) page before entering information.

## Why this workflow

The requesting clinician estimated 45–60 minutes or more for manual scoring, table lookup, and report preparation, compared with about 10 minutes or less using the system. These are **client-reported estimates**, not independently measured or guaranteed results. Fineland brings those steps together to reduce routine calculation and transcription work and free time for clinical care.

## Request the full system

This is a complete interactive demonstration. To request the full clinic system or a tailored deployment, [open a product enquiry](https://github.com/HostX0/fineland-demo/issues/new?template=product-enquiry.yml) for **Abdulazeez A. Noaman / DevsHub**, or visit the [owner's profile](https://github.com/HostX0). Enquiries are public; describe your requirements without patient information or private contact details.

## Run the demo locally

With Node.js 22 or newer installed, open a terminal in your downloaded copy and run:

```sh
npm start
```

Then open [the local demo](http://127.0.0.1:4173). No API keys, account, database, or external packages are needed. The hosted version is published automatically from this demonstration repository.

## Learn more

- [Product overview](docs/PRODUCT.md)
- [User guide](docs/USER-GUIDE.md)
- [Assessment and scoring notes](docs/ASSESSMENT.md)
- [Privacy and demo data](docs/PRIVACY.md)

## Instrument reference

The referenced instrument is Vineland-3, published by Pearson. Public reference materials are available in the [official Pearson manual appendices (B–E)](https://www.pearsonassessments.com/content/dam/school/global/clinical/us/assets/vineland-3/vineland-3-manual-appendices-b-e.pdf). This demo does not reproduce licensed item wording or reference tables in its documentation.
