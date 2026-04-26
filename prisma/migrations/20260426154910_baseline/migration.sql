-- CreateEnum
CREATE TYPE "RelationshipStatus" AS ENUM ('SINGLE', 'COUPLE');

-- CreateEnum
CREATE TYPE "PreferenceType" AS ENUM ('LIKE', 'DISLIKE');

-- CreateEnum
CREATE TYPE "Category" AS ENUM ('ART', 'LIVE_MUSIC', 'BARS', 'FOOD', 'COFFEE', 'OUTDOORS', 'FITNESS', 'SEASONAL', 'POPUP', 'OTHER', 'RESTAURANT', 'ACTIVITY_VENUE', 'COMEDY', 'SOCIAL', 'WELLNESS');

-- CreateEnum
CREATE TYPE "DenverTenure" AS ENUM ('NEW_TO_DENVER', 'ONE_TO_TWO_YEARS', 'TWO_TO_FIVE_YEARS', 'FIVE_PLUS_YEARS');

-- CreateEnum
CREATE TYPE "InteractionStatus" AS ENUM ('SAVED', 'ATTENDED');

-- CreateEnum
CREATE TYPE "ItemStatus" AS ENUM ('WANT', 'DONE', 'PASS');

-- CreateEnum
CREATE TYPE "EventListStatus" AS ENUM ('WANT', 'DONE');

-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('EVENT', 'PLACE');

-- CreateEnum
CREATE TYPE "PickSetRange" AS ENUM ('WEEK', 'MONTH');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EventRegion" AS ENUM ('DENVER_METRO', 'FRONT_RANGE', 'MOUNTAIN_GATEWAY', 'MOUNTAIN_DEST');

-- CreateEnum
CREATE TYPE "OpeningStatus" AS ENUM ('OPEN', 'COMING_SOON', 'SOFT_OPEN', 'TEMPORARILY_CLOSED', 'PERMANENTLY_CLOSED');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('NOTIFY_ON_OPEN', 'SOFT_OPEN_ALERT', 'FIRST_WEEK');

-- CreateEnum
CREATE TYPE "ListRole" AS ENUM ('VIEWER', 'EDITOR');

-- CreateEnum
CREATE TYPE "ListTemplate" AS ENUM ('DATE_NIGHT', 'WEEKEND_PLANS', 'VISITORS_GUIDE', 'GIRLS_NIGHT', 'GUYS_NIGHT', 'FAMILY_FUN', 'FREE_THINGS', 'CUSTOM');

-- CreateEnum
CREATE TYPE "BadgeCategory" AS ENUM ('EXPLORER', 'CATEGORY_FAN', 'SOCIAL', 'STREAK', 'PIONEER', 'SPECIAL', 'MILESTONE');

-- CreateEnum
CREATE TYPE "BadgeTier" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM');

-- CreateEnum
CREATE TYPE "GroupRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "GroupEventStatus" AS ENUM ('SUGGESTED', 'VOTING', 'CONFIRMED', 'PASSED', 'ATTENDED');

-- CreateEnum
CREATE TYPE "LeaderboardType" AS ENUM ('OVERALL', 'NEIGHBORHOOD', 'CATEGORY');

-- CreateEnum
CREATE TYPE "FeedbackSource" AS ENUM ('FEED_CARD', 'PROFILE_SWIPER', 'DETAIL_PAGE', 'LEGACY');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('SAVED_EVENT', 'ATTENDED_EVENT', 'CREATED_LIST', 'ADDED_TO_LIST', 'FOLLOWED_USER', 'RATED_PLACE');

-- CreateEnum
CREATE TYPE "FeedbackType" AS ENUM ('MORE', 'LESS', 'HIDE');

-- CreateEnum
CREATE TYPE "GoingWith" AS ENUM ('SOLO', 'DATE', 'FRIENDS', 'FAMILY');

-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateEnum
CREATE TYPE "TimeOfDay" AS ENUM ('MORNING', 'AFTERNOON', 'EVENING', 'LATE_NIGHT');

-- CreateEnum
CREATE TYPE "BudgetPreference" AS ENUM ('FREE', 'UNDER_25', 'UNDER_50', 'UNDER_100', 'ANY');

-- CreateEnum
CREATE TYPE "SocialIntent" AS ENUM ('MEET_PEOPLE', 'OWN_THING', 'EITHER');

-- CreateEnum
CREATE TYPE "ContextSegment" AS ENUM ('NEW_TO_CITY', 'IN_A_RUT', 'LOCAL_EXPLORER', 'VISITING');

-- CreateEnum
CREATE TYPE "SocialStyleType" AS ENUM ('SOCIAL_CONNECTOR', 'PASSIVE_SAVER', 'SOLO_EXPLORER', 'DIRECT_SHARER');

-- CreateEnum
CREATE TYPE "PlanningStyle" AS ENUM ('SPONTANEOUS', 'WEEKEND_PLANNER', 'ADVANCE_PLANNER');

-- CreateEnum
CREATE TYPE "BudgetTier" AS ENUM ('FREE_FOCUSED', 'MODERATE', 'TREAT_YOURSELF');

-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('DATE_NIGHT', 'SOCIAL', 'SOLO_CHILL', 'FAMILY_FUN', 'CUSTOM');

-- CreateEnum
CREATE TYPE "DiscoverySubtype" AS ENUM ('HIDDEN_GEM', 'NICHE_ACTIVITY', 'SEASONAL_TIP');

-- CreateEnum
CREATE TYPE "DiscoverySource" AS ENUM ('REDDIT', 'LLM_RESEARCH', 'NICHE_SITE', 'EDITORIAL', 'COMMUNITY');

-- CreateEnum
CREATE TYPE "DiscoveryStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'UNVERIFIED', 'FLAGGED');

-- CreateEnum
CREATE TYPE "LLMResearchRunStatus" AS ENUM ('PENDING', 'SUCCESS', 'PARSE_ERROR', 'API_ERROR');

-- CreateEnum
CREATE TYPE "DiscoveryRunStatus" AS ENUM ('PENDING', 'SUCCESS', 'PARTIAL', 'FAILED');

-- CreateEnum
CREATE TYPE "LabsItemType" AS ENUM ('COWORKING_SESSION', 'STARTUP_EVENT', 'BUILDER_MEETUP', 'GET_INVOLVED', 'WORKSHOP');

-- CreateEnum
CREATE TYPE "LabsItemStatus" AS ENUM ('ACTIVE', 'FULL', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "RSVPStatus" AS ENUM ('GOING', 'MAYBE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FriendshipStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "CalendarStatus" AS ENUM ('GOING', 'MAYBE', 'DECLINED');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'MAYBE');

-- CreateTable
CREATE TABLE "ScraperRun" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "region" "EventRegion" NOT NULL DEFAULT 'DENVER_METRO',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationMs" INTEGER NOT NULL,
    "rawCount" INTEGER NOT NULL DEFAULT 0,
    "insertedCount" INTEGER NOT NULL DEFAULT 0,
    "updatedCount" INTEGER NOT NULL DEFAULT 0,
    "enrichedCount" INTEGER NOT NULL DEFAULT 0,
    "droppedCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "errors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "succeeded" BOOLEAN NOT NULL DEFAULT true,
    "coverageAnomaly" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ScraperRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT,
    "name" TEXT,
    "bio" TEXT,
    "profileImageUrl" TEXT,
    "passwordHash" TEXT,
    "citySlug" TEXT NOT NULL DEFAULT 'denver',
    "relationshipStatus" "RelationshipStatus",
    "denverTenure" "DenverTenure",
    "onboardingComplete" BOOLEAN NOT NULL DEFAULT false,
    "profileStripDismissedAt" TIMESTAMP(3),
    "rankingVariant" TEXT NOT NULL DEFAULT 'control',
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "isInfluencer" BOOLEAN NOT NULL DEFAULT false,
    "referralCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "totalEventsAttended" INTEGER NOT NULL DEFAULT 0,
    "totalBadgesEarned" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "City" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Preference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" "Category" NOT NULL,
    "preferenceType" "PreferenceType" NOT NULL,
    "intensity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Preference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "Category" NOT NULL,
    "tags" TEXT[],
    "venueName" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "neighborhood" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "priceRange" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "externalId" TEXT,
    "imageUrl" TEXT,
    "googleMapsUrl" TEXT,
    "appleMapsUrl" TEXT,
    "googleRating" DOUBLE PRECISION,
    "googleRatingCount" INTEGER,
    "appleRating" DOUBLE PRECISION,
    "appleRatingCount" INTEGER,
    "placeId" TEXT,
    "createdById" TEXT,
    "status" "EventStatus" NOT NULL DEFAULT 'PUBLISHED',
    "publishedAt" TIMESTAMP(3),
    "coverImage" TEXT,
    "images" TEXT[],
    "ticketUrl" TEXT,
    "ticketInfo" TEXT,
    "vibeTags" TEXT[],
    "companionTags" TEXT[],
    "occasionTags" TEXT[],
    "whatsIncluded" TEXT[],
    "isDogFriendly" BOOLEAN NOT NULL DEFAULT false,
    "dogFriendlyDetails" TEXT,
    "isDrinkingOptional" BOOLEAN NOT NULL DEFAULT false,
    "isAlcoholFree" BOOLEAN NOT NULL DEFAULT false,
    "soberFriendlyNotes" TEXT,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "oneLiner" TEXT,
    "noveltyScore" INTEGER,
    "qualityScore" INTEGER,
    "isNew" BOOLEAN NOT NULL DEFAULT false,
    "isEditorsPick" BOOLEAN NOT NULL DEFAULT false,
    "driveTimeFromDenver" INTEGER,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "region" "EventRegion" NOT NULL DEFAULT 'DENVER_METRO',
    "townName" TEXT,
    "isDayTrip" BOOLEAN NOT NULL DEFAULT false,
    "isWeekendTrip" BOOLEAN NOT NULL DEFAULT false,
    "driveNote" TEXT,
    "worthTheDriveScore" INTEGER,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorEventFeature" (
    "id" TEXT NOT NULL,
    "influencerId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "quote" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isHost" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreatorEventFeature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventSocialContent" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "embedUrl" TEXT,
    "thumbnail" TEXT,
    "authorHandle" TEXT,
    "caption" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventSocialContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "type" "ItemType" NOT NULL,
    "cityId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "Category" NOT NULL,
    "tags" TEXT[],
    "venueName" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "googleMapsUrl" TEXT,
    "appleMapsUrl" TEXT,
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "priceRange" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "externalId" TEXT,
    "imageUrl" TEXT,
    "neighborhood" TEXT,
    "hours" TEXT,
    "vibeTags" TEXT[],
    "companionTags" TEXT[],
    "googleRating" DOUBLE PRECISION,
    "googleRatingCount" INTEGER,
    "appleRating" DOUBLE PRECISION,
    "appleRatingCount" INTEGER,
    "oneLiner" TEXT,
    "noveltyScore" INTEGER,
    "qualityScore" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserItemStatus" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemId" TEXT,
    "eventId" TEXT,
    "placeId" TEXT,
    "discoveryId" TEXT,
    "status" "ItemStatus" NOT NULL,
    "source" "FeedbackSource" NOT NULL DEFAULT 'LEGACY',
    "itemTitleSnapshot" TEXT,
    "itemCategorySnapshot" TEXT,
    "itemTownSnapshot" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserItemStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserItemRating" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserItemRating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemView" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSuggestionSet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "weeklyIds" TEXT[],
    "monthlyIds" TEXT[],
    "reasonsJson" TEXT NOT NULL,
    "summaryText" TEXT NOT NULL,
    "isAiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSuggestionSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserEventInteraction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "status" "InteractionStatus" NOT NULL,
    "rating" INTEGER,
    "liked" BOOLEAN,
    "notes" TEXT,
    "goingWith" "GoingWith",
    "calendarStatus" "CalendarStatus",
    "addedToCalendar" BOOLEAN NOT NULL DEFAULT false,
    "reminderSet" BOOLEAN NOT NULL DEFAULT false,
    "reminderTime" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserEventInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "List" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "coverImageUrl" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "template" "ListTemplate",
    "shareSlug" TEXT,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "saveCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "List_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListItem" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "eventId" TEXT,
    "placeId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListCollaborator" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ListRole" NOT NULL DEFAULT 'VIEWER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListCollaborator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GooglePlacesCache" (
    "id" TEXT NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "resultsJson" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GooglePlacesCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventUserStatus" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "status" "EventListStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventUserStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventView" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Influencer" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "handle" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "bio" TEXT NOT NULL,
    "profileImageUrl" TEXT,
    "profileColor" TEXT,
    "citySlug" TEXT NOT NULL DEFAULT 'denver',
    "instagram" TEXT,
    "tiktok" TEXT,
    "isDenverNative" BOOLEAN NOT NULL DEFAULT false,
    "yearsInDenver" INTEGER,
    "isFounder" BOOLEAN NOT NULL DEFAULT false,
    "vibeDescription" TEXT,
    "funFacts" TEXT[],
    "specialties" TEXT[],
    "preferredCategories" "Category"[],
    "isFeaturedCreator" BOOLEAN NOT NULL DEFAULT false,
    "guideCount" INTEGER NOT NULL DEFAULT 0,
    "coverImageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Influencer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InfluencerPickSet" (
    "id" TEXT NOT NULL,
    "influencerId" TEXT NOT NULL,
    "range" "PickSetRange" NOT NULL,
    "title" TEXT NOT NULL,
    "summaryText" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isAiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InfluencerPickSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InfluencerPick" (
    "id" TEXT NOT NULL,
    "pickSetId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InfluencerPick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserInfluencerFollow" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "influencerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserInfluencerFollow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserFollow" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserFollow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserActivity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "eventId" TEXT,
    "listId" TEXT,
    "targetUserId" TEXT,
    "itemId" TEXT,
    "metadata" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "referredId" TEXT NOT NULL,
    "referralCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contextSegment" "ContextSegment" NOT NULL,
    "socialStyle" "SocialStyleType" NOT NULL,
    "vibePreferences" JSONB NOT NULL,
    "planningStyle" "PlanningStyle" NOT NULL,
    "budgetTier" "BudgetTier" NOT NULL,
    "sparkResponse" TEXT,
    "opennessScore" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "extraversionScore" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "noveltyScore" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "aspirationCategories" TEXT[],
    "aspirationText" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RankedFeedCache" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rankedItems" JSONB NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "profileVersion" INTEGER NOT NULL,
    "feedbackCount" INTEGER NOT NULL,
    "isDirty" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "RankedFeedCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RankingRun" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "variant" TEXT NOT NULL DEFAULT 'control',
    "poolSize" INTEGER NOT NULL DEFAULT 0,
    "rankedCount" INTEGER NOT NULL DEFAULT 0,
    "serendipityCount" INTEGER NOT NULL DEFAULT 0,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RankingRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetailedPreferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "goingSolo" INTEGER,
    "goingDate" INTEGER,
    "goingFriends" INTEGER,
    "goingFamily" INTEGER,
    "timeWeeknight" INTEGER,
    "timeWeekend" INTEGER,
    "timeMorning" INTEGER,
    "timeDaytime" INTEGER,
    "timeEvening" INTEGER,
    "timeLateNight" INTEGER,
    "budget" "BudgetPreference" NOT NULL DEFAULT 'ANY',
    "vibeChill" INTEGER,
    "vibeModerate" INTEGER,
    "vibeHighEnergy" INTEGER,
    "socialIntent" "SocialIntent" NOT NULL DEFAULT 'EITHER',
    "hasDog" BOOLEAN NOT NULL DEFAULT false,
    "dogFriendlyOnly" BOOLEAN NOT NULL DEFAULT false,
    "preferSoberFriendly" BOOLEAN NOT NULL DEFAULT false,
    "avoidBars" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DetailedPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserFeedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "feedbackType" "FeedbackType" NOT NULL,
    "category" "Category",
    "tags" TEXT[],
    "venueName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserConstraints" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "preferredDays" "DayOfWeek"[],
    "preferredTimes" "TimeOfDay"[],
    "budgetMax" "BudgetPreference" NOT NULL DEFAULT 'ANY',
    "travelRadius" INTEGER,
    "homeNeighborhood" TEXT,
    "neighborhoods" TEXT[],
    "freeEventsOnly" BOOLEAN NOT NULL DEFAULT false,
    "discoveryMode" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserConstraints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventFeedView" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "seenCount" INTEGER NOT NULL DEFAULT 1,
    "lastShownAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "interacted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventFeedView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "planType" "PlanType" NOT NULL,
    "goingWith" "GoingWith" NOT NULL,
    "dateStart" TIMESTAMP(3) NOT NULL,
    "dateEnd" TIMESTAMP(3) NOT NULL,
    "totalCost" TEXT,
    "neighborhoods" TEXT[],
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanEvent" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "eventId" TEXT,
    "placeId" TEXT,
    "order" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Place" (
    "id" TEXT NOT NULL,
    "googlePlaceId" TEXT,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "googleMapsUrl" TEXT,
    "googleRating" DOUBLE PRECISION,
    "googleReviewCount" INTEGER,
    "appleMapsUrl" TEXT,
    "appleRating" DOUBLE PRECISION,
    "appleReviewCount" INTEGER,
    "combinedScore" DOUBLE PRECISION,
    "priceLevel" INTEGER,
    "types" TEXT[],
    "phoneNumber" TEXT,
    "website" TEXT,
    "openingHours" JSONB,
    "primaryImageUrl" TEXT,
    "neighborhood" TEXT,
    "citySlug" TEXT NOT NULL DEFAULT 'denver',
    "region" "EventRegion" NOT NULL DEFAULT 'DENVER_METRO',
    "townName" TEXT,
    "isDayTrip" BOOLEAN NOT NULL DEFAULT false,
    "isWeekendTrip" BOOLEAN NOT NULL DEFAULT false,
    "driveTimeFromDenver" INTEGER,
    "driveNote" TEXT,
    "category" "Category",
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "vibeTags" TEXT[],
    "companionTags" TEXT[],
    "occasionTags" TEXT[],
    "goodForTags" TEXT[],
    "pulseDescription" TEXT,
    "isDogFriendly" BOOLEAN NOT NULL DEFAULT false,
    "dogFriendlyAreas" TEXT[],
    "dogAmenities" TEXT[],
    "dogFriendlyNotes" TEXT,
    "isDrinkingOptional" BOOLEAN NOT NULL DEFAULT false,
    "isAlcoholFree" BOOLEAN NOT NULL DEFAULT false,
    "hasMocktailMenu" BOOLEAN NOT NULL DEFAULT false,
    "naOptions" TEXT[],
    "soberFriendlyNotes" TEXT,
    "openingStatus" "OpeningStatus" NOT NULL DEFAULT 'OPEN',
    "openedDate" TIMESTAMP(3),
    "announcedDate" TIMESTAMP(3),
    "expectedOpenDate" TIMESTAMP(3),
    "isNew" BOOLEAN NOT NULL DEFAULT false,
    "isUpcoming" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isLocalFavorite" BOOLEAN NOT NULL DEFAULT false,
    "touristTrapScore" DOUBLE PRECISION,
    "goodForWorking" BOOLEAN NOT NULL DEFAULT false,
    "buzzScore" INTEGER NOT NULL DEFAULT 0,
    "preOpeningSaves" INTEGER NOT NULL DEFAULT 0,
    "sneakPeekInfo" TEXT,
    "expectedPriceLevel" INTEGER,
    "conceptDescription" TEXT,
    "socialLinks" JSONB,
    "newsSource" TEXT,
    "newsSourceUrl" TEXT,
    "googleDataFetchedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Place_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Discovery" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "subtype" "DiscoverySubtype" NOT NULL,
    "category" "Category" NOT NULL,
    "neighborhood" TEXT,
    "townName" TEXT,
    "region" "EventRegion" NOT NULL DEFAULT 'DENVER_METRO',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "seasonHint" TEXT,
    "sourceType" "DiscoverySource" NOT NULL,
    "sourceUrl" TEXT,
    "sourceUpvotes" INTEGER,
    "mentionedByN" INTEGER NOT NULL DEFAULT 1,
    "qualityScore" INTEGER NOT NULL,
    "tags" TEXT[],
    "status" "DiscoveryStatus" NOT NULL DEFAULT 'ACTIVE',
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Discovery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LLMResearchRun" (
    "id" TEXT NOT NULL,
    "runBatchId" TEXT NOT NULL,
    "queryIndex" INTEGER NOT NULL,
    "queryLabel" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "rawResponse" TEXT,
    "candidates" JSONB,
    "candidateCount" INTEGER NOT NULL DEFAULT 0,
    "webSearches" INTEGER NOT NULL DEFAULT 0,
    "status" "LLMResearchRunStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LLMResearchRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscoveryRun" (
    "id" TEXT NOT NULL,
    "runBatchId" TEXT NOT NULL,
    "source" "DiscoverySource" NOT NULL,
    "status" "DiscoveryRunStatus" NOT NULL DEFAULT 'PENDING',
    "rawCandidateCount" INTEGER NOT NULL DEFAULT 0,
    "rejectedAsEventCount" INTEGER NOT NULL DEFAULT 0,
    "droppedForQualityCount" INTEGER NOT NULL DEFAULT 0,
    "unverifiedCount" INTEGER NOT NULL DEFAULT 0,
    "upsertedCount" INTEGER NOT NULL DEFAULT 0,
    "updatedExistingCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "errors" TEXT[],
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscoveryRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewPlaceAlert" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "alertType" "AlertType" NOT NULL,
    "notified" BOOLEAN NOT NULL DEFAULT false,
    "notifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewPlaceAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Badge" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "BadgeCategory" NOT NULL,
    "tier" "BadgeTier" NOT NULL DEFAULT 'BRONZE',
    "emoji" TEXT NOT NULL,
    "requirementType" TEXT NOT NULL,
    "requirementValue" INTEGER NOT NULL,
    "requirementMeta" JSONB,
    "colorHex" TEXT NOT NULL DEFAULT '#6B7280',
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Badge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBadge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "isEarned" BOOLEAN NOT NULL DEFAULT false,
    "earnedAt" TIMESTAMP(3),
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserBadge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaderboardEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "type" "LeaderboardType" NOT NULL,
    "typeValue" TEXT,
    "score" INTEGER NOT NULL DEFAULT 0,
    "eventsAttended" INTEGER NOT NULL DEFAULT 0,
    "uniquePlaces" INTEGER NOT NULL DEFAULT 0,
    "neighborhoodsVisited" INTEGER NOT NULL DEFAULT 0,
    "rank" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaderboardEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "emoji" TEXT NOT NULL DEFAULT '👥',
    "description" TEXT,
    "joinCode" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "memberCount" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupMember" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "GroupRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupEvent" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "suggestedById" TEXT NOT NULL,
    "status" "GroupEventStatus" NOT NULL DEFAULT 'SUGGESTED',
    "votesYes" TEXT[],
    "votesNo" TEXT[],
    "votesMaybe" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupPlace" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "suggestedById" TEXT NOT NULL,
    "status" "GroupEventStatus" NOT NULL DEFAULT 'SUGGESTED',
    "votesYes" TEXT[],
    "votesNo" TEXT[],
    "votesMaybe" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupPlace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabsItem" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "LabsItemType" NOT NULL,
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "venueName" TEXT,
    "address" TEXT,
    "neighborhood" TEXT,
    "isVirtual" BOOLEAN NOT NULL DEFAULT false,
    "virtualLink" TEXT,
    "tags" TEXT[],
    "imageUrl" TEXT,
    "hostName" TEXT,
    "hostImageUrl" TEXT,
    "capacity" INTEGER,
    "spotsLeft" INTEGER,
    "status" "LabsItemStatus" NOT NULL DEFAULT 'ACTIVE',
    "citySlug" TEXT NOT NULL DEFAULT 'denver',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabsItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabsRSVP" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "labsItemId" TEXT NOT NULL,
    "status" "RSVPStatus" NOT NULL DEFAULT 'GOING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabsRSVP_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabsSave" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "labsItemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LabsSave_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Friendship" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "addresseeId" TEXT NOT NULL,
    "status" "FriendshipStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Friendship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventInvitation" (
    "id" TEXT NOT NULL,
    "inviteeId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "inviterId" TEXT,
    "groupId" TEXT,
    "message" TEXT,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Neighborhood" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "coverImageUrl" TEXT,
    "placeCount" INTEGER NOT NULL DEFAULT 0,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Neighborhood_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Guide" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "tagline" TEXT NOT NULL,
    "coverImageUrl" TEXT,
    "description" TEXT NOT NULL,
    "durationLabel" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "neighborhoodHub" TEXT,
    "costRangeLabel" TEXT NOT NULL,
    "occasionTags" TEXT[],
    "vibeTags" TEXT[],
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "saveCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "creatorId" TEXT NOT NULL,

    CONSTRAINT "Guide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuideStop" (
    "id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "timeWindowStart" TEXT,
    "timeWindowEnd" TEXT,
    "note" TEXT NOT NULL,
    "insiderTip" TEXT,
    "walkTimeToNext" INTEGER,
    "walkTimeComputedAt" TIMESTAMP(3),
    "guideId" TEXT NOT NULL,
    "eventId" TEXT,
    "placeId" TEXT,

    CONSTRAINT "GuideStop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSavedGuide" (
    "userId" TEXT NOT NULL,
    "guideId" TEXT NOT NULL,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSavedGuide_pkey" PRIMARY KEY ("userId","guideId")
);

-- CreateTable
CREATE TABLE "UserSearchHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "resultsCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSearchHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScraperRun_source_startedAt_idx" ON "ScraperRun"("source", "startedAt");

-- CreateIndex
CREATE INDEX "ScraperRun_startedAt_idx" ON "ScraperRun"("startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");

-- CreateIndex
CREATE INDEX "User_username_idx" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_referralCode_idx" ON "User"("referralCode");

-- CreateIndex
CREATE INDEX "User_totalEventsAttended_idx" ON "User"("totalEventsAttended");

-- CreateIndex
CREATE UNIQUE INDEX "City_slug_key" ON "City"("slug");

-- CreateIndex
CREATE INDEX "Preference_userId_category_idx" ON "Preference"("userId", "category");

-- CreateIndex
CREATE INDEX "Event_cityId_startTime_idx" ON "Event"("cityId", "startTime");

-- CreateIndex
CREATE INDEX "Event_category_idx" ON "Event"("category");

-- CreateIndex
CREATE INDEX "Event_placeId_idx" ON "Event"("placeId");

-- CreateIndex
CREATE INDEX "Event_createdById_idx" ON "Event"("createdById");

-- CreateIndex
CREATE INDEX "Event_status_idx" ON "Event"("status");

-- CreateIndex
CREATE INDEX "Event_isEditorsPick_idx" ON "Event"("isEditorsPick");

-- CreateIndex
CREATE INDEX "Event_isArchived_startTime_idx" ON "Event"("isArchived", "startTime");

-- CreateIndex
CREATE INDEX "Event_lat_lng_idx" ON "Event"("lat", "lng");

-- CreateIndex
CREATE INDEX "Event_region_startTime_idx" ON "Event"("region", "startTime");

-- CreateIndex
CREATE UNIQUE INDEX "Event_externalId_source_key" ON "Event"("externalId", "source");

-- CreateIndex
CREATE INDEX "CreatorEventFeature_eventId_idx" ON "CreatorEventFeature"("eventId");

-- CreateIndex
CREATE INDEX "CreatorEventFeature_influencerId_idx" ON "CreatorEventFeature"("influencerId");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorEventFeature_influencerId_eventId_key" ON "CreatorEventFeature"("influencerId", "eventId");

-- CreateIndex
CREATE INDEX "EventSocialContent_eventId_idx" ON "EventSocialContent"("eventId");

-- CreateIndex
CREATE INDEX "Item_cityId_type_idx" ON "Item"("cityId", "type");

-- CreateIndex
CREATE INDEX "Item_type_startTime_idx" ON "Item"("type", "startTime");

-- CreateIndex
CREATE INDEX "Item_category_idx" ON "Item"("category");

-- CreateIndex
CREATE UNIQUE INDEX "Item_externalId_source_key" ON "Item"("externalId", "source");

-- CreateIndex
CREATE INDEX "UserItemStatus_userId_status_idx" ON "UserItemStatus"("userId", "status");

-- CreateIndex
CREATE INDEX "UserItemStatus_itemId_idx" ON "UserItemStatus"("itemId");

-- CreateIndex
CREATE INDEX "UserItemStatus_eventId_idx" ON "UserItemStatus"("eventId");

-- CreateIndex
CREATE INDEX "UserItemStatus_placeId_idx" ON "UserItemStatus"("placeId");

-- CreateIndex
CREATE INDEX "UserItemStatus_discoveryId_idx" ON "UserItemStatus"("discoveryId");

-- CreateIndex
CREATE UNIQUE INDEX "UserItemStatus_userId_itemId_key" ON "UserItemStatus"("userId", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "UserItemStatus_userId_eventId_key" ON "UserItemStatus"("userId", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "UserItemStatus_userId_placeId_key" ON "UserItemStatus"("userId", "placeId");

-- CreateIndex
CREATE UNIQUE INDEX "UserItemStatus_userId_discoveryId_key" ON "UserItemStatus"("userId", "discoveryId");

-- CreateIndex
CREATE INDEX "UserItemRating_userId_idx" ON "UserItemRating"("userId");

-- CreateIndex
CREATE INDEX "UserItemRating_itemId_idx" ON "UserItemRating"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "UserItemRating_userId_itemId_key" ON "UserItemRating"("userId", "itemId");

-- CreateIndex
CREATE INDEX "ItemView_userId_createdAt_idx" ON "ItemView"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ItemView_itemId_idx" ON "ItemView"("itemId");

-- CreateIndex
CREATE INDEX "UserSuggestionSet_userId_expiresAt_idx" ON "UserSuggestionSet"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "UserEventInteraction_userId_status_idx" ON "UserEventInteraction"("userId", "status");

-- CreateIndex
CREATE INDEX "UserEventInteraction_eventId_liked_idx" ON "UserEventInteraction"("eventId", "liked");

-- CreateIndex
CREATE UNIQUE INDEX "UserEventInteraction_userId_eventId_key" ON "UserEventInteraction"("userId", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "List_shareSlug_key" ON "List"("shareSlug");

-- CreateIndex
CREATE INDEX "List_isPublic_idx" ON "List"("isPublic");

-- CreateIndex
CREATE INDEX "List_shareSlug_idx" ON "List"("shareSlug");

-- CreateIndex
CREATE UNIQUE INDEX "List_userId_name_key" ON "List"("userId", "name");

-- CreateIndex
CREATE INDEX "ListItem_eventId_idx" ON "ListItem"("eventId");

-- CreateIndex
CREATE INDEX "ListItem_placeId_idx" ON "ListItem"("placeId");

-- CreateIndex
CREATE INDEX "ListItem_listId_order_idx" ON "ListItem"("listId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "ListItem_listId_eventId_key" ON "ListItem"("listId", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "ListItem_listId_placeId_key" ON "ListItem"("listId", "placeId");

-- CreateIndex
CREATE INDEX "ListCollaborator_userId_idx" ON "ListCollaborator"("userId");

-- CreateIndex
CREATE INDEX "ListCollaborator_listId_idx" ON "ListCollaborator"("listId");

-- CreateIndex
CREATE UNIQUE INDEX "ListCollaborator_listId_userId_key" ON "ListCollaborator"("listId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "GooglePlacesCache_cacheKey_key" ON "GooglePlacesCache"("cacheKey");

-- CreateIndex
CREATE INDEX "GooglePlacesCache_expiresAt_idx" ON "GooglePlacesCache"("expiresAt");

-- CreateIndex
CREATE INDEX "EventUserStatus_userId_status_idx" ON "EventUserStatus"("userId", "status");

-- CreateIndex
CREATE INDEX "EventUserStatus_eventId_idx" ON "EventUserStatus"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "EventUserStatus_userId_eventId_key" ON "EventUserStatus"("userId", "eventId");

-- CreateIndex
CREATE INDEX "EventView_userId_createdAt_idx" ON "EventView"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "EventView_eventId_idx" ON "EventView"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "Influencer_userId_key" ON "Influencer"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Influencer_handle_key" ON "Influencer"("handle");

-- CreateIndex
CREATE INDEX "Influencer_citySlug_idx" ON "Influencer"("citySlug");

-- CreateIndex
CREATE INDEX "Influencer_userId_idx" ON "Influencer"("userId");

-- CreateIndex
CREATE INDEX "Influencer_isFeaturedCreator_idx" ON "Influencer"("isFeaturedCreator");

-- CreateIndex
CREATE INDEX "InfluencerPickSet_influencerId_range_idx" ON "InfluencerPickSet"("influencerId", "range");

-- CreateIndex
CREATE INDEX "InfluencerPickSet_expiresAt_idx" ON "InfluencerPickSet"("expiresAt");

-- CreateIndex
CREATE INDEX "InfluencerPick_pickSetId_rank_idx" ON "InfluencerPick"("pickSetId", "rank");

-- CreateIndex
CREATE INDEX "InfluencerPick_itemId_idx" ON "InfluencerPick"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "InfluencerPick_pickSetId_itemId_key" ON "InfluencerPick"("pickSetId", "itemId");

-- CreateIndex
CREATE INDEX "UserInfluencerFollow_userId_idx" ON "UserInfluencerFollow"("userId");

-- CreateIndex
CREATE INDEX "UserInfluencerFollow_influencerId_idx" ON "UserInfluencerFollow"("influencerId");

-- CreateIndex
CREATE UNIQUE INDEX "UserInfluencerFollow_userId_influencerId_key" ON "UserInfluencerFollow"("userId", "influencerId");

-- CreateIndex
CREATE INDEX "UserFollow_followerId_idx" ON "UserFollow"("followerId");

-- CreateIndex
CREATE INDEX "UserFollow_followingId_idx" ON "UserFollow"("followingId");

-- CreateIndex
CREATE UNIQUE INDEX "UserFollow_followerId_followingId_key" ON "UserFollow"("followerId", "followingId");

-- CreateIndex
CREATE INDEX "UserActivity_userId_createdAt_idx" ON "UserActivity"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "UserActivity_createdAt_idx" ON "UserActivity"("createdAt");

-- CreateIndex
CREATE INDEX "UserActivity_type_idx" ON "UserActivity"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Referral_referredId_key" ON "Referral"("referredId");

-- CreateIndex
CREATE INDEX "Referral_referrerId_idx" ON "Referral"("referrerId");

-- CreateIndex
CREATE INDEX "Referral_referralCode_idx" ON "Referral"("referralCode");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RankedFeedCache_userId_key" ON "RankedFeedCache"("userId");

-- CreateIndex
CREATE INDEX "RankedFeedCache_computedAt_idx" ON "RankedFeedCache"("computedAt");

-- CreateIndex
CREATE INDEX "RankingRun_createdAt_idx" ON "RankingRun"("createdAt");

-- CreateIndex
CREATE INDEX "RankingRun_userId_createdAt_idx" ON "RankingRun"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DetailedPreferences_userId_key" ON "DetailedPreferences"("userId");

-- CreateIndex
CREATE INDEX "UserFeedback_userId_feedbackType_idx" ON "UserFeedback"("userId", "feedbackType");

-- CreateIndex
CREATE INDEX "UserFeedback_userId_category_idx" ON "UserFeedback"("userId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "UserFeedback_userId_eventId_key" ON "UserFeedback"("userId", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "UserConstraints_userId_key" ON "UserConstraints"("userId");

-- CreateIndex
CREATE INDEX "EventFeedView_userId_lastShownAt_idx" ON "EventFeedView"("userId", "lastShownAt");

-- CreateIndex
CREATE INDEX "EventFeedView_eventId_idx" ON "EventFeedView"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "EventFeedView_userId_eventId_key" ON "EventFeedView"("userId", "eventId");

-- CreateIndex
CREATE INDEX "Plan_userId_dateStart_idx" ON "Plan"("userId", "dateStart");

-- CreateIndex
CREATE INDEX "PlanEvent_planId_order_idx" ON "PlanEvent"("planId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "PlanEvent_planId_eventId_key" ON "PlanEvent"("planId", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "PlanEvent_planId_placeId_key" ON "PlanEvent"("planId", "placeId");

-- CreateIndex
CREATE UNIQUE INDEX "Place_googlePlaceId_key" ON "Place"("googlePlaceId");

-- CreateIndex
CREATE INDEX "Place_citySlug_idx" ON "Place"("citySlug");

-- CreateIndex
CREATE INDEX "Place_lat_lng_idx" ON "Place"("lat", "lng");

-- CreateIndex
CREATE INDEX "Place_category_idx" ON "Place"("category");

-- CreateIndex
CREATE INDEX "Place_googleRating_idx" ON "Place"("googleRating");

-- CreateIndex
CREATE INDEX "Place_combinedScore_idx" ON "Place"("combinedScore");

-- CreateIndex
CREATE INDEX "Place_openingStatus_idx" ON "Place"("openingStatus");

-- CreateIndex
CREATE INDEX "Place_isNew_idx" ON "Place"("isNew");

-- CreateIndex
CREATE INDEX "Place_isUpcoming_idx" ON "Place"("isUpcoming");

-- CreateIndex
CREATE INDEX "Place_openedDate_idx" ON "Place"("openedDate");

-- CreateIndex
CREATE INDEX "Place_expectedOpenDate_idx" ON "Place"("expectedOpenDate");

-- CreateIndex
CREATE INDEX "Place_isLocalFavorite_idx" ON "Place"("isLocalFavorite");

-- CreateIndex
CREATE INDEX "Place_goodForWorking_idx" ON "Place"("goodForWorking");

-- CreateIndex
CREATE INDEX "Place_region_idx" ON "Place"("region");

-- CreateIndex
CREATE INDEX "Discovery_status_qualityScore_idx" ON "Discovery"("status", "qualityScore");

-- CreateIndex
CREATE INDEX "Discovery_category_status_idx" ON "Discovery"("category", "status");

-- CreateIndex
CREATE INDEX "Discovery_region_status_idx" ON "Discovery"("region", "status");

-- CreateIndex
CREATE INDEX "LLMResearchRun_runBatchId_idx" ON "LLMResearchRun"("runBatchId");

-- CreateIndex
CREATE INDEX "LLMResearchRun_status_createdAt_idx" ON "LLMResearchRun"("status", "createdAt");

-- CreateIndex
CREATE INDEX "LLMResearchRun_queryLabel_createdAt_idx" ON "LLMResearchRun"("queryLabel", "createdAt");

-- CreateIndex
CREATE INDEX "DiscoveryRun_runBatchId_idx" ON "DiscoveryRun"("runBatchId");

-- CreateIndex
CREATE INDEX "DiscoveryRun_source_createdAt_idx" ON "DiscoveryRun"("source", "createdAt");

-- CreateIndex
CREATE INDEX "DiscoveryRun_status_createdAt_idx" ON "DiscoveryRun"("status", "createdAt");

-- CreateIndex
CREATE INDEX "NewPlaceAlert_userId_idx" ON "NewPlaceAlert"("userId");

-- CreateIndex
CREATE INDEX "NewPlaceAlert_placeId_idx" ON "NewPlaceAlert"("placeId");

-- CreateIndex
CREATE INDEX "NewPlaceAlert_notified_idx" ON "NewPlaceAlert"("notified");

-- CreateIndex
CREATE UNIQUE INDEX "NewPlaceAlert_userId_placeId_alertType_key" ON "NewPlaceAlert"("userId", "placeId", "alertType");

-- CreateIndex
CREATE UNIQUE INDEX "Badge_slug_key" ON "Badge"("slug");

-- CreateIndex
CREATE INDEX "Badge_category_idx" ON "Badge"("category");

-- CreateIndex
CREATE INDEX "Badge_tier_idx" ON "Badge"("tier");

-- CreateIndex
CREATE INDEX "UserBadge_userId_isEarned_idx" ON "UserBadge"("userId", "isEarned");

-- CreateIndex
CREATE INDEX "UserBadge_badgeId_idx" ON "UserBadge"("badgeId");

-- CreateIndex
CREATE UNIQUE INDEX "UserBadge_userId_badgeId_key" ON "UserBadge"("userId", "badgeId");

-- CreateIndex
CREATE INDEX "LeaderboardEntry_period_type_score_idx" ON "LeaderboardEntry"("period", "type", "score");

-- CreateIndex
CREATE INDEX "LeaderboardEntry_userId_idx" ON "LeaderboardEntry"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "LeaderboardEntry_userId_period_type_typeValue_key" ON "LeaderboardEntry"("userId", "period", "type", "typeValue");

-- CreateIndex
CREATE UNIQUE INDEX "Group_joinCode_key" ON "Group"("joinCode");

-- CreateIndex
CREATE INDEX "Group_joinCode_idx" ON "Group"("joinCode");

-- CreateIndex
CREATE INDEX "Group_isPublic_idx" ON "Group"("isPublic");

-- CreateIndex
CREATE INDEX "GroupMember_userId_idx" ON "GroupMember"("userId");

-- CreateIndex
CREATE INDEX "GroupMember_groupId_idx" ON "GroupMember"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupMember_groupId_userId_key" ON "GroupMember"("groupId", "userId");

-- CreateIndex
CREATE INDEX "GroupEvent_groupId_status_idx" ON "GroupEvent"("groupId", "status");

-- CreateIndex
CREATE INDEX "GroupEvent_eventId_idx" ON "GroupEvent"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupEvent_groupId_eventId_key" ON "GroupEvent"("groupId", "eventId");

-- CreateIndex
CREATE INDEX "GroupPlace_groupId_status_idx" ON "GroupPlace"("groupId", "status");

-- CreateIndex
CREATE INDEX "GroupPlace_placeId_idx" ON "GroupPlace"("placeId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupPlace_groupId_placeId_key" ON "GroupPlace"("groupId", "placeId");

-- CreateIndex
CREATE INDEX "LabsItem_type_idx" ON "LabsItem"("type");

-- CreateIndex
CREATE INDEX "LabsItem_status_idx" ON "LabsItem"("status");

-- CreateIndex
CREATE INDEX "LabsItem_startTime_idx" ON "LabsItem"("startTime");

-- CreateIndex
CREATE INDEX "LabsItem_citySlug_idx" ON "LabsItem"("citySlug");

-- CreateIndex
CREATE INDEX "LabsRSVP_userId_idx" ON "LabsRSVP"("userId");

-- CreateIndex
CREATE INDEX "LabsRSVP_labsItemId_idx" ON "LabsRSVP"("labsItemId");

-- CreateIndex
CREATE UNIQUE INDEX "LabsRSVP_userId_labsItemId_key" ON "LabsRSVP"("userId", "labsItemId");

-- CreateIndex
CREATE INDEX "LabsSave_userId_idx" ON "LabsSave"("userId");

-- CreateIndex
CREATE INDEX "LabsSave_labsItemId_idx" ON "LabsSave"("labsItemId");

-- CreateIndex
CREATE UNIQUE INDEX "LabsSave_userId_labsItemId_key" ON "LabsSave"("userId", "labsItemId");

-- CreateIndex
CREATE INDEX "Friendship_requesterId_status_idx" ON "Friendship"("requesterId", "status");

-- CreateIndex
CREATE INDEX "Friendship_addresseeId_status_idx" ON "Friendship"("addresseeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Friendship_requesterId_addresseeId_key" ON "Friendship"("requesterId", "addresseeId");

-- CreateIndex
CREATE INDEX "EventInvitation_inviteeId_status_idx" ON "EventInvitation"("inviteeId", "status");

-- CreateIndex
CREATE INDEX "EventInvitation_eventId_idx" ON "EventInvitation"("eventId");

-- CreateIndex
CREATE INDEX "EventInvitation_inviterId_idx" ON "EventInvitation"("inviterId");

-- CreateIndex
CREATE INDEX "EventInvitation_groupId_idx" ON "EventInvitation"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "Neighborhood_slug_key" ON "Neighborhood"("slug");

-- CreateIndex
CREATE INDEX "Neighborhood_isFeatured_displayOrder_idx" ON "Neighborhood"("isFeatured", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Guide_slug_key" ON "Guide"("slug");

-- CreateIndex
CREATE INDEX "Guide_slug_idx" ON "Guide"("slug");

-- CreateIndex
CREATE INDEX "Guide_isPublished_isFeatured_idx" ON "Guide"("isPublished", "isFeatured");

-- CreateIndex
CREATE INDEX "Guide_creatorId_idx" ON "Guide"("creatorId");

-- CreateIndex
CREATE INDEX "GuideStop_guideId_order_idx" ON "GuideStop"("guideId", "order");

-- CreateIndex
CREATE INDEX "GuideStop_eventId_idx" ON "GuideStop"("eventId");

-- CreateIndex
CREATE INDEX "GuideStop_placeId_idx" ON "GuideStop"("placeId");

-- CreateIndex
CREATE INDEX "UserSavedGuide_userId_idx" ON "UserSavedGuide"("userId");

-- CreateIndex
CREATE INDEX "UserSearchHistory_userId_createdAt_idx" ON "UserSearchHistory"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "Preference" ADD CONSTRAINT "Preference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Influencer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorEventFeature" ADD CONSTRAINT "CreatorEventFeature_influencerId_fkey" FOREIGN KEY ("influencerId") REFERENCES "Influencer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorEventFeature" ADD CONSTRAINT "CreatorEventFeature_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventSocialContent" ADD CONSTRAINT "EventSocialContent_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserItemStatus" ADD CONSTRAINT "UserItemStatus_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserItemStatus" ADD CONSTRAINT "UserItemStatus_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserItemStatus" ADD CONSTRAINT "UserItemStatus_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserItemStatus" ADD CONSTRAINT "UserItemStatus_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserItemStatus" ADD CONSTRAINT "UserItemStatus_discoveryId_fkey" FOREIGN KEY ("discoveryId") REFERENCES "Discovery"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserItemRating" ADD CONSTRAINT "UserItemRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserItemRating" ADD CONSTRAINT "UserItemRating_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemView" ADD CONSTRAINT "ItemView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemView" ADD CONSTRAINT "ItemView_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSuggestionSet" ADD CONSTRAINT "UserSuggestionSet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserEventInteraction" ADD CONSTRAINT "UserEventInteraction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserEventInteraction" ADD CONSTRAINT "UserEventInteraction_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "List" ADD CONSTRAINT "List_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListItem" ADD CONSTRAINT "ListItem_listId_fkey" FOREIGN KEY ("listId") REFERENCES "List"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListItem" ADD CONSTRAINT "ListItem_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListItem" ADD CONSTRAINT "ListItem_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListCollaborator" ADD CONSTRAINT "ListCollaborator_listId_fkey" FOREIGN KEY ("listId") REFERENCES "List"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListCollaborator" ADD CONSTRAINT "ListCollaborator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventUserStatus" ADD CONSTRAINT "EventUserStatus_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventUserStatus" ADD CONSTRAINT "EventUserStatus_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventView" ADD CONSTRAINT "EventView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventView" ADD CONSTRAINT "EventView_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InfluencerPickSet" ADD CONSTRAINT "InfluencerPickSet_influencerId_fkey" FOREIGN KEY ("influencerId") REFERENCES "Influencer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InfluencerPick" ADD CONSTRAINT "InfluencerPick_pickSetId_fkey" FOREIGN KEY ("pickSetId") REFERENCES "InfluencerPickSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InfluencerPick" ADD CONSTRAINT "InfluencerPick_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserInfluencerFollow" ADD CONSTRAINT "UserInfluencerFollow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserInfluencerFollow" ADD CONSTRAINT "UserInfluencerFollow_influencerId_fkey" FOREIGN KEY ("influencerId") REFERENCES "Influencer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFollow" ADD CONSTRAINT "UserFollow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFollow" ADD CONSTRAINT "UserFollow_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserActivity" ADD CONSTRAINT "UserActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserActivity" ADD CONSTRAINT "UserActivity_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserActivity" ADD CONSTRAINT "UserActivity_listId_fkey" FOREIGN KEY ("listId") REFERENCES "List"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserActivity" ADD CONSTRAINT "UserActivity_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referredId_fkey" FOREIGN KEY ("referredId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RankedFeedCache" ADD CONSTRAINT "RankedFeedCache_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetailedPreferences" ADD CONSTRAINT "DetailedPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFeedback" ADD CONSTRAINT "UserFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFeedback" ADD CONSTRAINT "UserFeedback_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserConstraints" ADD CONSTRAINT "UserConstraints_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventFeedView" ADD CONSTRAINT "EventFeedView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventFeedView" ADD CONSTRAINT "EventFeedView_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanEvent" ADD CONSTRAINT "PlanEvent_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanEvent" ADD CONSTRAINT "PlanEvent_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanEvent" ADD CONSTRAINT "PlanEvent_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewPlaceAlert" ADD CONSTRAINT "NewPlaceAlert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewPlaceAlert" ADD CONSTRAINT "NewPlaceAlert_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "Badge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaderboardEntry" ADD CONSTRAINT "LeaderboardEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupEvent" ADD CONSTRAINT "GroupEvent_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupEvent" ADD CONSTRAINT "GroupEvent_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupEvent" ADD CONSTRAINT "GroupEvent_suggestedById_fkey" FOREIGN KEY ("suggestedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupPlace" ADD CONSTRAINT "GroupPlace_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupPlace" ADD CONSTRAINT "GroupPlace_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupPlace" ADD CONSTRAINT "GroupPlace_suggestedById_fkey" FOREIGN KEY ("suggestedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabsRSVP" ADD CONSTRAINT "LabsRSVP_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabsRSVP" ADD CONSTRAINT "LabsRSVP_labsItemId_fkey" FOREIGN KEY ("labsItemId") REFERENCES "LabsItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabsSave" ADD CONSTRAINT "LabsSave_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabsSave" ADD CONSTRAINT "LabsSave_labsItemId_fkey" FOREIGN KEY ("labsItemId") REFERENCES "LabsItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_addresseeId_fkey" FOREIGN KEY ("addresseeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventInvitation" ADD CONSTRAINT "EventInvitation_inviteeId_fkey" FOREIGN KEY ("inviteeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventInvitation" ADD CONSTRAINT "EventInvitation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventInvitation" ADD CONSTRAINT "EventInvitation_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventInvitation" ADD CONSTRAINT "EventInvitation_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guide" ADD CONSTRAINT "Guide_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Influencer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuideStop" ADD CONSTRAINT "GuideStop_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "Guide"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuideStop" ADD CONSTRAINT "GuideStop_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuideStop" ADD CONSTRAINT "GuideStop_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSavedGuide" ADD CONSTRAINT "UserSavedGuide_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSavedGuide" ADD CONSTRAINT "UserSavedGuide_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "Guide"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSearchHistory" ADD CONSTRAINT "UserSearchHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

┌─────────────────────────────────────────────────────────┐
│  Update available 5.22.0 -> 7.8.0                       │
│                                                         │
│  This is a major update - please follow the guide at    │
│  https://pris.ly/d/major-version-upgrade                │
│                                                         │
│  Run the following to update                            │
│    npm i --save-dev prisma@latest                       │
│    npm i @prisma/client@latest                          │
└─────────────────────────────────────────────────────────┘
