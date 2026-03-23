import PerformanceReview from "../models/Performance.js";
import User from "../models/User.js";

// POST /api/performance-reviews  (ADMIN/MANAGER)
export const createReview = async (req, res) => {
  try {
    const { user, rating, feedback, period } = req.body;

    if (!user || !rating || !period) {
      return res.status(400).json({ message: "user, rating, and period are required" });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    // One review per user per period from the same reviewer
    const existing = await PerformanceReview.findOne({
      user,
      reviewer : req.user.id,
      period
    });
    if (existing) {
      return res.status(400).json({
        message: `You have already submitted a review for this user in period: ${period}`
      });
    }

    const review = await PerformanceReview.create({
      user,
      reviewer : req.user.id,
      rating,
      feedback,
      period
    });

    res.status(201).json({ message: "Performance review submitted", review });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/performance-reviews  (ADMIN/MANAGER — all reviews)
export const getAllReviews = async (req, res) => {
  try {
    const { period, userId } = req.query;
    const filter = {};

    if (period) filter.period = period;
    if (userId) filter.user   = userId;

    const reviews = await PerformanceReview
      .find(filter)
      .populate("user", "name email role")
      .populate("reviewer", "name email")
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/performance-reviews/my  (EMPLOYEE/FREELANCER — own reviews)
export const getMyReviews = async (req, res) => {
  try {
    const reviews = await PerformanceReview
      .find({ user: req.user.id })
      .populate("reviewer", "name email")
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/performance-reviews/summary/:userId
// Returns aggregated rating summary across all periods
export const getReviewSummary = async (req, res) => {
  try {
    const { userId } = req.params;

    // Ownership guard
    if (req.user.role === "EMPLOYEE" || req.user.role === "FREELANCER") {
      if (req.user.id !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    const reviews = await PerformanceReview.find({ user: userId });

    if (reviews.length === 0) {
      return res.json({ userId, message: "No reviews found", summary: null });
    }

    const ratings     = reviews.map(r => r.rating);
    const avgRating   = +(ratings.reduce((s, r) => s + r, 0) / ratings.length).toFixed(2);
    const highestRating = Math.max(...ratings);
    const lowestRating  = Math.min(...ratings);

    // Group by period
    const byPeriod = reviews.reduce((acc, r) => {
      if (!acc[r.period]) acc[r.period] = [];
      acc[r.period].push(r.rating);
      return acc;
    }, {});

    const periodSummary = Object.entries(byPeriod).map(([period, pRatings]) => ({
      period,
      avgRating : +(pRatings.reduce((s, r) => s + r, 0) / pRatings.length).toFixed(2),
      reviewCount: pRatings.length
    }));

    res.json({
      userId,
      totalReviews  : reviews.length,
      avgRating,
      highestRating,
      lowestRating,
      trend         : periodSummary.sort((a, b) => a.period.localeCompare(b.period))
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/performance-reviews/:id  (reviewer can update their own review)
export const updateReview = async (req, res) => {
  try {
    const review = await PerformanceReview.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }
    if (review.reviewer.toString() !== req.user.id && req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "You can only edit your own reviews" });
    }

    const { rating, feedback } = req.body;
    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    const updated = await PerformanceReview.findByIdAndUpdate(
      req.params.id,
      { rating, feedback },
      { new: true, runValidators: true }
    );

    res.json({ message: "Review updated", review: updated });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/performance-reviews/:id  (ADMIN only)
export const deleteReview = async (req, res) => {
  try {
    const review = await PerformanceReview.findByIdAndDelete(req.params.id);
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }
    res.json({ message: "Review deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};