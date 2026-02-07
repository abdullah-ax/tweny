# Tweny - Data-Driven Menu Engineering Platform

## Project Overview

Tweny is an AI-powered menu optimization platform that transforms how restaurants engineer their menus based on real customer behavior data. By leveraging advanced analytics, machine learning, and behavioral psychology, Tweny enables restaurant owners to move beyond intuition and make data-driven decisions that maximize profitability and customer satisfaction.

### The Problem

Restaurants sit on a goldmine of sales data—every order, every customer preference—yet most make menu decisions on hunches. They don't know which dishes are silently losing money, which pricing strategies work best, or what menu layouts drive higher conversion rates. This represents significant revenue left on the table.

### Our Solution

Tweny provides a closed-loop system that:
1. **Ingests and digitizes** existing menus through OCR and PDF extraction
2. **Analyzes sales data** to identify high-performing and underperforming items
3. **Applies behavioral psychology** to optimize menu layout and pricing
4. **Deploys A/B experiments** to test different menu strategies
5. **Tracks real-time performance** through comprehensive analytics
6. **Recommends actionable improvements** based on customer behavior patterns

---

## Features

### Core Functionality

**1. Menu Digitization**
- Upload PDF or image-based menus
- OCR-powered text extraction (supports 100+ languages via Tesseract.js)
- Automatic item categorization and structure recognition
- Manual editing and refinement tools

**2. Data-Driven Analytics Dashboard**
- **Sales Performance Metrics**: Total orders, revenue, average order value, growth trends
- **Top Selling Items**: Ranked list with quantity sold, revenue generated, and order frequency
- **Frequently Ordered Together**: AI-powered recommendation engine identifying item pairs ordered together 2+ times
- **Recent Orders**: Detailed order history with item-level breakdown
- **Daily Trends**: Time-series visualization of orders and revenue
- **Menu Change Tracking**: Audit trail of menu modifications and their impact

**3. Psychology-Based Menu Strategies**
- **Golden Triangle Layout**: Places high-margin items in visual hotspots
- **Anchoring Pricing**: Strategic price comparisons to increase perceived value
- **Decoy Pricing**: Asymmetrically dominated options to steer choices
- **Scarcity Effects**: Limited-time promotions to drive urgency

**4. A/B Testing & Experiments**
- Deploy multiple menu variants simultaneously
- Track conversion rates, average order value, and item mix
- Scientific experiment insights with statistical significance
- Automated winner selection based on performance metrics

**5. AI-Powered Optimization Assistant**
- Natural language chat interface for menu advice
- Recommendations based on sales data analysis
- Real-time suggestions for pricing and promotion strategies
- Menu psychology best practices guidance

**6. Customer Feedback Loop**
- Voice feedback collection system
- Sentiment analysis on customer responses
- Integration with order data for comprehensive insights

### Technical Features

- **Real-time Analytics**: Live data updates as orders come in
- **QR Code Deployment**: Instant menu rollout to customers
- **Multi-Restaurant Support**: Manage multiple locations from one dashboard
- **Mock Payment Flow**: Complete checkout simulation for testing
- **Responsive Design**: Works seamlessly on all device sizes
- **Authentication & Authorization**: Secure access control for restaurant owners

---

## Technologies Used

### Frontend
- **Next.js 15**: React framework with App Router for optimal performance
- **React 19**: Latest React with concurrent features and improved performance
- **TypeScript**: Type-safe development with enhanced tooling
- **Tailwind CSS**: Utility-first CSS framework for rapid UI development
- **Framer Motion**: Smooth animations and transitions

### Backend & Database
- **Drizzle ORM**: Type-safe SQL toolkit with excellent TypeScript support
- **Neon Postgres**: Serverless PostgreSQL database for scalable data storage
- **Next.js API Routes**: Serverless API endpoints for all backend operations

### AI & Machine Learning
- **Tesseract.js**: Browser-based OCR engine for menu text extraction (100+ languages)
- **PDF.js**: PDF parsing and content extraction
- **Custom Analytics Engine**: Item co-occurrence analysis and pattern recognition
- **Bandit Algorithm**: Multi-armed bandit for intelligent A/B testing optimization

### Third-Party Integrations
- **JWT Authentication**: Secure token-based authentication
- **Canvas API**: QR code generation for menu deployment
- **Web Speech API**: Voice feedback collection

### Development Tools
- **ESLint & Prettier**: Code quality and formatting
- **Git**: Version control with proper branching strategy

---

## Installation & Setup

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (we recommend Neon for serverless)
- Git for version control

### Step-by-Step Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/your-username/tweny.git
   cd tweny
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Set Up Environment Variables**
   
   Create a `.env.local` file in the root directory:
   ```bash
   # Database Configuration
   DATABASE_URL=postgresql://user:password@host:5432/database
   
   # Authentication
   JWT_SECRET=your-super-secret-jwt-key-min-32-chars
   
   # Optional: External Services
   OPENAI_API_KEY=your-openai-api-key
   ```

4. **Initialize Database**
   ```bash
   # Run database migrations
   npm run db:push
   
   # (Optional) Seed with sample data
   npm run db:seed
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

6. **Access the Application**
   - Open [http://localhost:3000](http://localhost:3000) in your browser
   - Register a new account or use demo credentials:
     - Email: `demo@tweny.ai`
     - Password: `demo1234`

### Production Deployment

```bash
# Build for production
npm run build

# Start production server
npm start
```

Deploy to Vercel, Netlify, or any Node.js hosting platform.

---

## Usage Guide

### 1. Getting Started

After logging in, you'll see the restaurant dashboard. Here's the typical workflow:

**Step 1: Import Your Menu**
- Navigate to "Import" in the sidebar
- Upload a PDF menu or take a photo
- The AI will automatically extract menu items and categories
- Review and edit the extracted data as needed

**Step 2: Create an Optimized Layout**
- Go to "Visual Editor" or "Strategy"
- Choose a psychology-backed strategy (Golden Triangle, Anchoring, etc.)
- Customize the layout by dragging items to different sections
- Save and name your layout

**Step 3: Deploy Your Menu**
- Select your layout and click "Deploy"
- Generate a QR code
- Print the QR code and place it on tables
- Customers can now scan and order from your optimized menu

**Step 4: Monitor Performance**
- Navigate to the "Analytics" dashboard
- View real-time sales data and key metrics
- Identify top-selling items and underperformers
- Check "Frequently Ordered Together" for cross-selling opportunities

**Step 5: Iterate and Optimize**
- Use the "Strategy" AI chat for optimization advice
- Create A/B tests to compare different layouts
- Analyze experiment results to pick the winning variant
- Continuously refine your menu based on data insights

### 2. Understanding Your Analytics

**What's Selling Section**
- Shows your top 10 items by revenue
- Displays quantity sold and order frequency
- Helps identify your star performers

**Frequently Ordered Together Section**
- Reveals item pairs customers frequently buy together
- Only shows combinations ordered together 2+ times
- Use this data to create bundles, combos, or strategic placements
- Example: If "Burger" + "Fries" appears often, consider a meal deal

**Recent Orders**
- Track individual orders with item details
- Monitor order timing and patterns
- Identify unusual orders or customer behavior

**Growth Metrics**
- Compare current period to previous period
- Track order volume and revenue growth
- Measure the impact of menu changes

### 3. Running A/B Experiments

1. **Create Multiple Layouts**: Design 2-3 different menu versions
2. **Start Experiment**: Navigate to "Experiments" and create a new test
3. **Set Allocation**: Choose traffic split (e.g., 50/50 or 33/33/34)
4. **Monitor Results**: Watch conversion rates and average order values
5. **Pick Winner**: The platform will recommend the best-performing layout
6. **Scale**: Apply the winning layout to all customers

### 4. Using the AI Assistant

- Access the AI chat from the "Strategy" page
- Ask questions like:
  - "How can I increase my average order value?"
  - "Which items should I remove from my menu?"
  - "What's the best pricing strategy for my top items?"
  - "How should I lay out my menu for maximum profit?"
- Receive actionable, data-backed recommendations

---

## How Tweny Enables Data-Driven Menu Engineering

### From Intuition to Intelligence

Traditional menu engineering relies on outdated heuristics and gut feelings. Tweny transforms this process by providing:

**1. Real Customer Behavior Data**
- Every order is tracked and analyzed
- Item co-occurrence patterns reveal natural customer preferences
- Time-of-day and seasonal trends inform inventory decisions
- A/B testing provides definitive answers on what works

**2. Scientific Experimentation**
- Test hypotheses with actual customer traffic
- Statistical significance ensures results aren't random
- Multi-armed bandit algorithm automatically optimizes for best outcomes
- Continuous improvement loop: test, measure, iterate

**3. Behavioral Psychology Applied**
- Golden Triangle positioning guides customer eye flow
- Decoy pricing steers customers toward high-margin items
- Anchoring effects increase perceived value
- Scarcity and urgency drive faster decisions

**4. Actionable Insights**
- Identify "Stars" (high profit, high popularity)
- Spot "Plowhorses" (low profit, high popularity) for pricing optimization
- Find "Puzzles" (high profit, low popularity) for promotion
- Remove "Dogs" (low profit, low popularity) that waste menu space

**5. Continuous Optimization Cycle**
```
Analyze → Hypothesize → Experiment → Measure → Optimize → Repeat
```

### Real-World Impact

Restaurants using Tweny can expect:
- **10-20% increase** in average order value through strategic placement
- **15-25% reduction** in decision time through optimized layouts
- **5-10% improvement** in customer satisfaction via better item discovery
- **Data-driven confidence** in every menu decision
- **Continuous learning** from customer behavior patterns

---

## Demo Access

Experience Tweny with our live demo:

- **Live App**: [tweny.vercel.app](https://tweny.vercel.app)
- **Demo Credentials**:
  - Email: `demo@tweny.ai`
  - Password: `demo1234`

The demo includes sample restaurants with historical sales data, pre-configured menus, and ongoing experiments to showcase the full capabilities of the platform.

---

## Team Members

This project was developed by a collaborative team focused on solving real restaurant challenges through data-driven solutions.

Abdullah Ahmed - Technical Implementation
Ibrahim Elahmady - Data use techniques
Hana Elazzazi - Research, Testing, UI/UX principles
Linah Aboudoma - Research, Testing, UI/UX principles

---

## License

This project is part of the Deloitte x AUC Hackathon. All rights reserved.

---

## Contact & Support

For questions, support, or collaboration opportunities, please contact the development team.

---

## Acknowledgments

Built as part of the Deloitte x AUC Hackathon, addressing real-world challenges in the restaurant industry through innovative technology and data-driven solutions.