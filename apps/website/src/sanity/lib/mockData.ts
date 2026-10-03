import { BlogPost, Category } from "./types";

export const MOCK_CATEGORIES: Category[] = [
  {
    _id: "cat-1",
    title: "Clinical Excellence",
    slug: { current: "clinical-excellence" },
    description: "Innovations and workflows shaping premier aesthetic and medical clinics.",
  },
  {
    _id: "cat-2",
    title: "Patient Experience",
    slug: { current: "patient-experience" },
    description: "Designing memorable, frictionless journeys for modern healthcare consumers.",
  },
  {
    _id: "cat-3",
    title: "Wellness Tech",
    slug: { current: "wellness-tech" },
    description: "How digital intelligence and bespoke clinic apps elevate treatment outcomes.",
  },
  {
    _id: "cat-4",
    title: "Clinic Growth",
    slug: { current: "clinic-growth" },
    description: "Retention, recurring memberships, and scalable revenue models.",
  },
];

export const MOCK_POSTS: BlogPost[] = [
  {
    _id: "post-aurwell-repeatmd",
    title: "Aurwell vs RepeatMD: What’s the Difference?",
    slug: { current: "aurwell-vs-repeatmd-whats-the-difference" },
    excerpt:
      "Discover how Aurwell’s bespoke clinical branding and integrated patient journeys contrast with RepeatMD’s transactional e-commerce model for medical spas.",
    publishedAt: "2026-03-30T10:00:00Z",
    readingTime: 6,
    author: {
      _id: "author-1",
      name: "Dr. Elena Vance",
      slug: { current: "dr-elena-vance" },
      role: "Chief Medical Officer & Founder",
      bio: "Board-certified aesthetic physician with over 14 years specializing in regenerative dermatology and personalized care systems.",
      image: "https://images.unsplash.com/photo-1594824813633-460d37e5473e?auto=format&fit=crop&w=300&q=80",
    },
    mainImage: {
      url: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1400&q=85",
      alt: "Modern aesthetic clinic reception and consultation suite",
      caption: "High-end aesthetic practices prioritize brand prestige over transactional retail catalogs.",
    },
    categories: [MOCK_CATEGORIES[0], MOCK_CATEGORIES[2]],
    body: [
      {
        _key: "b1",
        _type: "block",
        style: "normal",
        children: [
          {
            _key: "c1",
            _type: "span",
            text: "In the competitive aesthetic medicine and medical spa landscape, patient retention is the primary determinant of enterprise value. Today, medspas and cosmetic clinics frequently evaluate patient engagement platforms to turn one-time neurotoxin or dermal filler visits into predictable lifetime relationships.",
          },
        ],
      },
      {
        _key: "b2",
        _type: "block",
        style: "normal",
        children: [
          {
            _key: "c2",
            _type: "span",
            text: "Two platforms frequently appear in this evaluation: Aurwell and RepeatMD. While both aim to elevate practice revenue and cultivate client loyalty, they approach the aesthetic patient experience from fundamentally different philosophies.",
          },
        ],
      },
      {
        _key: "b3",
        _type: "block",
        style: "blockquote",
        children: [
          {
            _key: "c3",
            _type: "span",
            text: "“Aesthetic medicine is built on clinical authority and patient trust. Pushing discount catalogs and retail shopping carts erodes the luxury care experience.”",
          },
        ],
      },
      {
        _key: "b4",
        _type: "block",
        style: "h2",
        children: [
          {
            _key: "c4",
            _type: "span",
            text: "The Difference: Retail Catalog vs. Clinical Sanctuary",
          },
        ],
      },
      {
        _key: "b5",
        _type: "block",
        style: "normal",
        children: [
          {
            _key: "c5",
            _type: "span",
            text: "RepeatMD gained traction by introducing consumer e-commerce and fintech financing to aesthetic practices. Its core mechanics mirror consumer retail apps: flash sales, coupon alerts, and standardized shopping shells. For practices running high-volume, discount-heavy campaigns, it acts as a direct mobile storefront.",
          },
        ],
      },
      {
        _key: "b6",
        _type: "block",
        style: "normal",
        children: [
          {
            _key: "c6",
            _type: "span",
            text: "Aurwell was built specifically for modern aesthetic clinics, wellness studios, and cosmetic dermatology practices that prioritize brand prestige, clinical trust, and frictionless continuity of care. Aurwell automatically imports your clinic's typography, palette, and treatment menu to generate a bespoke mobile app in 24 to 48 hours.",
          },
        ],
      },
      {
        _key: "b7",
        _type: "callout",
        title: "Key Takeaway",
        text: "Choose RepeatMD if your business model depends on consumer financing and retail flash sales. Choose Aurwell if you operate a premier practice where brand equity, tiered VIP memberships, and real-time appointment booking are essential.",
      },
    ],
  },
  {
    _id: "post-aurwell-zenoti",
    title: "Aurwell vs Zenoti: Which Approach Fits Growing Beauty Clinics?",
    slug: { current: "aurwell-vs-zenoti-which-approach-fits-growing-beauty-clinics" },
    excerpt:
      "A realistic breakdown comparing Zenoti’s enterprise-scale ERP software with Aurwell’s agile, patient-centric loyalty and mobile app layer.",
    publishedAt: "2026-03-27T14:30:00Z",
    readingTime: 7,
    author: {
      _id: "author-2",
      name: "Marcus Aurel",
      slug: { current: "marcus-aurel" },
      role: "Head of Product Strategy",
      bio: "Focuses on behavioral design, membership retention mechanics, and software experiences for forward-thinking clinics.",
      image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80",
    },
    mainImage: {
      url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1400&q=85",
      alt: "Modern architecture and clinic design",
      caption: "Choosing between enterprise complexity and agile patient-first software.",
    },
    categories: [MOCK_CATEGORIES[3], MOCK_CATEGORIES[0]],
    body: [
      {
        _key: "b1",
        _type: "block",
        style: "normal",
        children: [
          {
            _key: "c1",
            _type: "span",
            text: "When scaling an aesthetic clinic from an ambitious single location to a multi-provider practice, technology choices can either accelerate growth or introduce operational gridlock. Zenoti is recognized as an enterprise all-in-one ERP software giant, while Aurwell represents the modern wave of agile, patient-obsessed software.",
          },
        ],
      },
      {
        _key: "b2",
        _type: "block",
        style: "normal",
        children: [
          {
            _key: "c2",
            _type: "span",
            text: "Zenoti is built for 25+ location enterprise chains, franchise networks, and resort spas requiring deep multi-warehouse supply chain tracking and centralized payroll. However, rollouts often take 3 to 6 months of grueling data migration, and the patient-facing mobile portal can feel rigid and complex.",
          },
        ],
      },
      {
        _key: "b3",
        _type: "block",
        style: "h2",
        children: [
          {
            _key: "c3",
            _type: "span",
            text: "Aurwell's Agile Retention Layer",
          },
        ],
      },
      {
        _key: "b4",
        _type: "block",
        style: "normal",
        children: [
          {
            _key: "c4",
            _type: "span",
            text: "Aurwell takes a fundamentally different vantage point: the patient interface is the growth engine of the modern clinic. Instead of forcing your staff through months of painful software migration, Aurwell acts as a high-performance retention and patient engagement layer ready in under 48 hours.",
          },
        ],
      },
      {
        _key: "b5",
        _type: "callout",
        title: "Strategic Decision",
        text: "Independent and growing multi-location aesthetic clinics achieve 4x faster ROI by keeping their core operational tools while layering Aurwell's luxury mobile experience for patient retention.",
      },
    ],
  },
  {
    _id: "post-different-traditional",
    title: "What Makes Aurwell Different From Traditional Clinic Management Software?",
    slug: { current: "what-makes-aurwell-different-from-traditional-clinic-management-software" },
    excerpt:
      "Why traditional practice management systems fail at patient retention, and how Aurwell bridges the divide between clinical operations and client devotion.",
    publishedAt: "2026-03-24T09:15:00Z",
    readingTime: 5,
    author: {
      _id: "author-1",
      name: "Dr. Elena Vance",
      slug: { current: "dr-elena-vance" },
      role: "Chief Medical Officer & Founder",
      bio: "Board-certified aesthetic physician with over 14 years specializing in regenerative dermatology and personalized care systems.",
      image: "https://images.unsplash.com/photo-1594824813633-460d37e5473e?auto=format&fit=crop&w=300&q=80",
    },
    mainImage: {
      url: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1400&q=85",
      alt: "Pristine clinic architectural design",
      caption: "Outside-in software design elevates the patient emotional journey.",
    },
    categories: [MOCK_CATEGORIES[2], MOCK_CATEGORIES[1]],
    body: [
      {
        _key: "b1",
        _type: "block",
        style: "normal",
        children: [
          {
            _key: "c1",
            _type: "span",
            text: "Traditional clinic software systems—such as Jane App, Mindbody, Boulevard, and AestheticsPro—were engineered from the inside out. Their primary goal is administrative record-keeping: storing SOAP notes, managing employee shifts, and generating sales tax reports. The patient portal was tacked on as an afterthought.",
          },
        ],
      },
      {
        _key: "b2",
        _type: "block",
        style: "normal",
        children: [
          {
            _key: "c2",
            _type: "span",
            text: "Aurwell reverses this paradigm completely by engineering from the outside in. Aesthetic medicine is a luxury lifestyle service. The digital touchpoint between treatments must feel as refined, discreet, and comforting as the clinic’s interior lounge.",
          },
        ],
      },
      {
        _key: "b3",
        _type: "block",
        style: "blockquote",
        children: [
          {
            _key: "c3",
            _type: "span",
            text: "“Traditional clinic management software records what happened in the past. Aurwell actively shapes what happens in the future.”",
          },
        ],
      },
    ],
  },
  {
    _id: "post-loyalty-vs-clinic-mgmt",
    title: "Patient Loyalty Software vs Clinic Management Software: What’s the Difference?",
    slug: { current: "patient-loyalty-software-vs-clinic-management-software-whats-the-difference" },
    excerpt:
      "Why high-performing aesthetic clinics separate backend clinical operations from front-end patient retention architectures.",
    publishedAt: "2026-03-20T11:00:00Z",
    readingTime: 5,
    author: {
      _id: "author-2",
      name: "Marcus Aurel",
      slug: { current: "marcus-aurel" },
      role: "Head of Product Strategy",
      bio: "Focuses on behavioral design, membership retention mechanics, and software experiences for forward-thinking clinics.",
      image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80",
    },
    mainImage: {
      url: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1400&q=85",
      alt: "Peaceful holistic wellness clinic space",
      caption: "Separating back-of-house operations from front-of-house patient loyalty.",
    },
    categories: [MOCK_CATEGORIES[3], MOCK_CATEGORIES[0]],
    body: [
      {
        _key: "b1",
        _type: "block",
        style: "normal",
        children: [
          {
            _key: "c1",
            _type: "span",
            text: "Clinic directors often ask: 'We already have practice management software with an appointment calendar. Why do we need dedicated patient loyalty software?' This question arises from confusing operational administration with relationship architecture.",
          },
        ],
      },
      {
        _key: "b2",
        _type: "block",
        style: "normal",
        children: [
          {
            _key: "c2",
            _type: "span",
            text: "Clinic Management Software runs the back-of-house: clinical charts, regulatory compliance, and room scheduling. Patient Loyalty Software runs the front-of-house: continuous brand presence on the smartphone home screen, tiered VIP status, banked membership revenue, and automated treatment recalls.",
          },
        ],
      },
      {
        _key: "b3",
        _type: "callout",
        title: "The Winning Synergy",
        text: "The highest-performing aesthetic practices do not ask their EMR to act as a marketing agency. They pair robust clinical charting with Aurwell's dedicated patient experience layer.",
      },
    ],
  },
  {
    _id: "post-discounts-to-loyalty",
    title: "Why Beauty Clinics Are Moving From Discounts to Loyalty Programs",
    slug: { current: "why-beauty-clinics-are-moving-from-discounts-to-loyalty-programs" },
    excerpt:
      "How price-slashing devalues clinical expertise, attracts churn-prone deal hunters, and why premium clinics are adopting value-driven loyalty frameworks.",
    publishedAt: "2026-03-15T08:30:00Z",
    readingTime: 6,
    author: {
      _id: "author-1",
      name: "Dr. Elena Vance",
      slug: { current: "dr-elena-vance" },
      role: "Chief Medical Officer & Founder",
      bio: "Board-certified aesthetic physician with over 14 years specializing in regenerative dermatology and personalized care systems.",
      image: "https://images.unsplash.com/photo-1594824813633-460d37e5473e?auto=format&fit=crop&w=300&q=80",
    },
    mainImage: {
      url: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1400&q=85",
      alt: "Clinical skin treatment consultation",
      caption: "Protecting margins and clinical dignity through value-driven loyalty.",
    },
    categories: [MOCK_CATEGORIES[1], MOCK_CATEGORIES[3]],
    body: [
      {
        _key: "b1",
        _type: "block",
        style: "normal",
        children: [
          {
            _key: "c1",
            _type: "span",
            text: "For years, the standard playbook for aesthetic practices looking to fill open appointments was straightforward: run a flash sale. While discounts spark temporary booking spikes, premier aesthetic clinics, cosmetic dermatologists, and medspas are systematically abandoning price cuts.",
          },
        ],
      },
      {
        _key: "b2",
        _type: "block",
        style: "normal",
        children: [
          {
            _key: "c2",
            _type: "span",
            text: "Discounts erode profit margins, attract bargain-hunters with 70%+ churn rates, and devalue clinical expertise. Instead, modern practices use value-added loyalty programs that reward treatment frequency and adherence with elevated VIP status, exclusive perks, and banked subscriptions.",
          },
        ],
      },
      {
        _key: "b3",
        _type: "block",
        style: "blockquote",
        children: [
          {
            _key: "c3",
            _type: "span",
            text: "“Discounting treats healthcare like fast fashion. Value-driven loyalty treats healthcare like an aspirational investment in self-worth.”",
          },
        ],
      },
    ],
  },
  {
    _id: "post-guide-loyalty",
    title: "The Complete Guide to Beauty Clinic Loyalty Programs",
    slug: { current: "the-complete-guide-to-beauty-clinic-loyalty-programs" },
    excerpt:
      "Everything you need to design, launch, and scale a high-retention loyalty system that protects margins and increases patient lifetime value.",
    publishedAt: "2026-03-10T12:00:00Z",
    readingTime: 8,
    author: {
      _id: "author-2",
      name: "Marcus Aurel",
      slug: { current: "marcus-aurel" },
      role: "Head of Product Strategy",
      bio: "Focuses on behavioral design, membership retention mechanics, and software experiences for forward-thinking clinics.",
      image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80",
    },
    mainImage: {
      url: "https://images.unsplash.com/photo-1512290900672-1f4864c39eb0?auto=format&fit=crop&w=1400&q=85",
      alt: "Luxury skincare clinic treatment room",
      caption: "A blueprint for predictable recurring clinic revenue and client retention.",
    },
    categories: [MOCK_CATEGORIES[3], MOCK_CATEGORIES[0]],
    body: [
      {
        _key: "b1",
        _type: "block",
        style: "normal",
        children: [
          {
            _key: "c1",
            _type: "span",
            text: "Patient retention is the true engine of aesthetic practice profitability. Acquiring a new cosmetic patient through digital ads costs between $150 and $350. Retaining that same patient for two to five years multiplies your practice's enterprise valuation.",
          },
        ],
      },
      {
        _key: "b2",
        _type: "block",
        style: "normal",
        children: [
          {
            _key: "c2",
            _type: "span",
            text: "A premier loyalty program combines three essential elements: an aspirational tiered status structure (Silver, Gold, Diamond VIP), banked subscription memberships that stabilize monthly cash flow, and non-monetary clinical perks such as complimentary red-light therapy and priority holiday booking.",
          },
        ],
      },
      {
        _key: "b3",
        _type: "callout",
        title: "Golden Rule of Point Economies",
        text: "Calibrate points so that cash-back equivalent stays between 3% and 5%, paired with high-perceived-value, low-cost clinical add-ons to protect net margins.",
      },
    ],
  },
  {
    _id: "post-5-mistakes",
    title: "5 Patient Experience Mistakes Beauty Clinics Make",
    slug: { current: "5-patient-experience-mistakes-beauty-clinics-make" },
    excerpt:
      "Discover the subtle operational and digital missteps that drive aesthetic patients to competing clinics—and how to fix them.",
    publishedAt: "2026-03-05T09:45:00Z",
    readingTime: 6,
    author: {
      _id: "author-1",
      name: "Dr. Elena Vance",
      slug: { current: "dr-elena-vance" },
      role: "Chief Medical Officer & Founder",
      bio: "Board-certified aesthetic physician with over 14 years specializing in regenerative dermatology and personalized care systems.",
      image: "https://images.unsplash.com/photo-1594824813633-460d37e5473e?auto=format&fit=crop&w=300&q=80",
    },
    mainImage: {
      url: "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=1400&q=85",
      alt: "Aesthetic clinic patient consultation",
      caption: "Eliminating digital and operational friction preserves patient loyalty.",
    },
    categories: [MOCK_CATEGORIES[1]],
    body: [
      {
        _key: "b1",
        _type: "block",
        style: "normal",
        children: [
          {
            _key: "c1",
            _type: "span",
            text: "In aesthetic medicine, clinical precision is only half of the equation. Your injectors may possess flawless technique and your laser suite may feature FDA-cleared technology, yet patients may still fail to return if subtle points of friction occur in their journey.",
          },
        ],
      },
      {
        _key: "b2",
        _type: "block",
        style: "normal",
        children: [
          {
            _key: "c2",
            _type: "span",
            text: "The five most critical mistakes include: relying on cold, clunky patient portals; leaving aftercare to paper handouts; passive recall (waiting for patients to call for neurotoxin refreshers); treating loyalty like a cheap punch card; and disorganized checkout friction at the front desk.",
          },
        ],
      },
      {
        _key: "b3",
        _type: "callout",
        title: "Action Item",
        text: "By digitizing aftercare into your branded mobile app and automating 75-day toxin recall cadences, clinics reduce churn by over 38% in the first quarter.",
      },
    ],
  },
];
