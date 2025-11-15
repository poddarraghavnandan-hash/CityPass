-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateEnum
CREATE TYPE "EventCategory" AS ENUM ('MUSIC', 'COMEDY', 'THEATRE', 'FITNESS', 'DANCE', 'ARTS', 'FOOD', 'NETWORKING', 'FAMILY', 'OTHER');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('VENUE', 'PROMOTER', 'TICKETING', 'MEDIA', 'BLOG', 'AGGREGATOR');

-- CreateEnum
CREATE TYPE "CrawlMethod" AS ENUM ('FIRECRAWL', 'APIFY', 'MANUAL');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'RETRYING');

-- CreateEnum
CREATE TYPE "IngestionRequestStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "SearchTimeframe" AS ENUM ('TODAY', 'WEEK', 'MONTH');

-- CreateEnum
CREATE TYPE "AnalyticsEventType" AS ENUM ('IMPRESSION', 'VIEW', 'EXPAND', 'SAVE', 'SHARE', 'OUTBOUND_CLICK', 'BOOK_CLICK', 'DISMISS', 'HIDE_VENUE', 'HIDE_CATEGORY', 'REPORT', 'AD_IMPRESSION', 'AD_CLICK', 'AD_VIEWABLE', 'AD_CONVERSION', 'SEARCH', 'FILTER_CHANGE', 'WEB_VITAL');

-- CreateEnum
CREATE TYPE "AdCampaignStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ENDED', 'REJECTED', 'PENDING_REVIEW');

-- CreateEnum
CREATE TYPE "AdPacing" AS ENUM ('EVEN', 'ASAP');

-- CreateEnum
CREATE TYPE "AdCreativeKind" AS ENUM ('DISPLAY', 'NATIVE', 'HOUSE_EVENT', 'SPONSORED_COLLECTION');

-- CreateEnum
CREATE TYPE "AdCreativeStatus" AS ENUM ('ACTIVE', 'PAUSED', 'REJECTED', 'PENDING_REVIEW');

-- CreateEnum
CREATE TYPE "AdSlot" AS ENUM ('FEED_P3', 'FEED_P10', 'FEED_END', 'MAP_PIN', 'DETAIL_SIDEBAR', 'SEARCH_INTERSTITIAL', 'HEADER_BANNER');

-- CreateEnum
CREATE TYPE "AdConversionType" AS ENUM ('BOOK_CLICK', 'OUTBOUND_CLICK', 'SAVE', 'SHARE');

-- CreateEnum
CREATE TYPE "AdPolicyStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'FLAGGED');

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "source_url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "subtitle" TEXT,
    "description" TEXT,
    "category" "EventCategory",
    "organizer" TEXT,
    "venue_name" TEXT,
    "address" TEXT,
    "neighborhood" TEXT,
    "lat" DOUBLE PRECISION,
    "lon" DOUBLE PRECISION,
    "end_time" TIMESTAMP(3),
    "timezone" TEXT DEFAULT 'America/New_York',
    "price_min" DOUBLE PRECISION,
    "price_max" DOUBLE PRECISION,
    "currency" TEXT DEFAULT 'USD',
    "min_age" INTEGER,
    "tags" TEXT[],
    "image_url" TEXT,
    "booking_url" TEXT,
    "accessibility" TEXT[],
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "view_count_24h" INTEGER NOT NULL DEFAULT 0,
    "save_count" INTEGER NOT NULL DEFAULT 0,
    "save_count_24h" INTEGER NOT NULL DEFAULT 0,
    "share_count" INTEGER NOT NULL DEFAULT 0,
    "click_count" INTEGER NOT NULL DEFAULT 0,
    "source_domain" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "canonical_url_hash" TEXT NOT NULL,
    "venue_id" TEXT,
    "source_id" TEXT,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "venues" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "neighborhood" TEXT,
    "city" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lon" DOUBLE PRECISION,
    "website" TEXT,
    "description" TEXT,
    "image_url" TEXT,
    "canonical_name" TEXT NOT NULL,

    CONSTRAINT "venues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sources" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "source_type" "SourceType" NOT NULL,
    "category" "EventCategory",
    "crawl_method" "CrawlMethod" NOT NULL DEFAULT 'FIRECRAWL',
    "crawl_frequency" INTEGER NOT NULL DEFAULT 3600,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "last_crawled" TIMESTAMP(3),
    "last_success" TIMESTAMP(3),
    "event_selector" TEXT,

    CONSTRAINT "sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingest_jobs" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "source_id" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "pages_processed" INTEGER NOT NULL DEFAULT 0,
    "events_found" INTEGER NOT NULL DEFAULT 0,
    "events_created" INTEGER NOT NULL DEFAULT 0,
    "events_updated" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "crawl_method" TEXT,
    "metadata" JSONB,

    CONSTRAINT "ingest_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingestion_requests" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "city" TEXT NOT NULL,
    "tokens" JSONB,
    "reason" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "status" "IngestionRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requested_by" TEXT,
    "requester_ip" TEXT,
    "requester_agent" TEXT,
    "started_at" TIMESTAMP(3),
    "processed_at" TIMESTAMP(3),
    "last_error" TEXT,
    "result_summary" JSONB,

    CONSTRAINT "ingestion_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_cache" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "city" TEXT NOT NULL,
    "query" TEXT NOT NULL DEFAULT '',
    "category" "EventCategory",
    "timeframe" "SearchTimeframe" NOT NULL,
    "results" JSONB NOT NULL,
    "eventIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'BATCH',

    CONSTRAINT "search_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "email_verified" TIMESTAMP(3),
    "name" TEXT,
    "image" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "home_city" TEXT,
    "neighborhoods" TEXT[],
    "favorite_categories" TEXT[],
    "price_min" DOUBLE PRECISION,
    "price_max" DOUBLE PRECISION,
    "time_of_day" TEXT,
    "min_age_pref" INTEGER,
    "last_seen_at" TIMESTAMP(3),
    "search_count" INTEGER NOT NULL DEFAULT 0,
    "meta" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "query" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "filters" JSONB NOT NULL,
    "results_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discovery_logs" (
    "id" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "engine" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "score" DOUBLE PRECISION,
    "accepted" BOOLEAN NOT NULL DEFAULT false,
    "events_found" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discovery_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_vectors" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "qdrant_id" TEXT NOT NULL,
    "embedding_version" TEXT NOT NULL,
    "last_embedded_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_vectors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ranking_weights" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "weights" JSONB NOT NULL,
    "metrics" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ranking_weights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "session_id" TEXT NOT NULL,
    "event_id" TEXT,
    "ad_campaign_id" TEXT,
    "ad_creative_id" TEXT,
    "type" "AnalyticsEventType" NOT NULL,
    "props" JSONB NOT NULL,
    "city" TEXT,
    "device_type" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_consents" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "session_id" TEXT NOT NULL,
    "analytics" BOOLEAN NOT NULL DEFAULT false,
    "personalization" BOOLEAN NOT NULL DEFAULT false,
    "advertising" BOOLEAN NOT NULL DEFAULT false,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_interactions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "session_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "saved" BOOLEAN NOT NULL DEFAULT false,
    "shared" BOOLEAN NOT NULL DEFAULT false,
    "bookmarked" BOOLEAN NOT NULL DEFAULT false,
    "dismissed" BOOLEAN NOT NULL DEFAULT false,
    "view_duration" INTEGER,
    "expanded_details" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_blocklists" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "session_id" TEXT NOT NULL,
    "venue_id" TEXT,
    "venue_name" TEXT,
    "category" TEXT,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_blocklists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_campaigns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "advertiser" TEXT NOT NULL,
    "status" "AdCampaignStatus" NOT NULL DEFAULT 'ACTIVE',
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "daily_budget" DOUBLE PRECISION NOT NULL,
    "total_budget" DOUBLE PRECISION NOT NULL,
    "pacing" "AdPacing" NOT NULL DEFAULT 'EVEN',
    "quality_score" DOUBLE PRECISION DEFAULT 1.0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ad_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_creatives" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "kind" "AdCreativeKind" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "image_url" TEXT,
    "click_url" TEXT NOT NULL,
    "event_id" TEXT,
    "status" "AdCreativeStatus" NOT NULL DEFAULT 'ACTIVE',
    "policy_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ad_creatives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_targetings" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "cities" TEXT[],
    "neighborhoods" TEXT[],
    "categories" TEXT[],
    "price_min" DOUBLE PRECISION,
    "price_max" DOUBLE PRECISION,
    "times_of_day" TEXT[],
    "days_of_week" TEXT[],
    "keywords" TEXT[],
    "exclude_venues" TEXT[],
    "include_venues" TEXT[],
    "age_min" INTEGER,
    "age_max" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ad_targetings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_budgets" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "spent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "viewable" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "today_spent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "today_date" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ad_budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_impressions" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "creative_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "user_id" TEXT,
    "slot" "AdSlot" NOT NULL,
    "city" TEXT,
    "query" TEXT,
    "viewable" BOOLEAN NOT NULL DEFAULT false,
    "viewed_at" TIMESTAMP(3),
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ad_impressions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_clicks" (
    "id" TEXT NOT NULL,
    "impression_id" TEXT NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ad_clicks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_conversions" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "impression_id" TEXT,
    "click_id" TEXT,
    "event_id" TEXT,
    "type" "AdConversionType" NOT NULL,
    "value" DOUBLE PRECISION,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ad_conversions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_frequency_caps" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "last_shown_at" TIMESTAMP(3) NOT NULL,
    "resets_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ad_frequency_caps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_policies" (
    "id" TEXT NOT NULL,
    "creative_id" TEXT NOT NULL,
    "reviewed_by" TEXT,
    "status" "AdPolicyStatus" NOT NULL,
    "rejection_reason" TEXT,
    "notes" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ad_policies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "events_city_start_time_idx" ON "events"("city", "start_time");

-- CreateIndex
CREATE INDEX "events_category_start_time_idx" ON "events"("category", "start_time");

-- CreateIndex
CREATE INDEX "events_start_time_idx" ON "events"("start_time");

-- CreateIndex
CREATE INDEX "events_source_domain_idx" ON "events"("source_domain");

-- CreateIndex
CREATE INDEX "events_checksum_idx" ON "events"("checksum");

-- CreateIndex
CREATE UNIQUE INDEX "events_canonical_url_hash_start_time_key" ON "events"("canonical_url_hash", "start_time");

-- CreateIndex
CREATE INDEX "venues_city_idx" ON "venues"("city");

-- CreateIndex
CREATE UNIQUE INDEX "venues_canonical_name_city_key" ON "venues"("canonical_name", "city");

-- CreateIndex
CREATE UNIQUE INDEX "sources_url_key" ON "sources"("url");

-- CreateIndex
CREATE INDEX "sources_domain_idx" ON "sources"("domain");

-- CreateIndex
CREATE INDEX "sources_active_last_crawled_idx" ON "sources"("active", "last_crawled");

-- CreateIndex
CREATE INDEX "ingest_jobs_source_id_created_at_idx" ON "ingest_jobs"("source_id", "created_at");

-- CreateIndex
CREATE INDEX "ingest_jobs_status_idx" ON "ingest_jobs"("status");

-- CreateIndex
CREATE INDEX "ingestion_requests_city_status_idx" ON "ingestion_requests"("city", "status");

-- CreateIndex
CREATE INDEX "ingestion_requests_status_priority_created_at_idx" ON "ingestion_requests"("status", "priority", "created_at");

-- CreateIndex
CREATE INDEX "idx_search_cache_timeframe_city" ON "search_cache"("timeframe", "city");

-- CreateIndex
CREATE UNIQUE INDEX "search_cache_city_timeframe_query_category_key" ON "search_cache"("city", "timeframe", "query", "category");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_token_key" ON "sessions"("session_token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_provider_account_id_key" ON "accounts"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_user_id_key" ON "user_profiles"("user_id");

-- CreateIndex
CREATE INDEX "user_profiles_home_city_idx" ON "user_profiles"("home_city");

-- CreateIndex
CREATE INDEX "search_sessions_user_id_created_at_idx" ON "search_sessions"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "search_sessions_city_created_at_idx" ON "search_sessions"("city", "created_at");

-- CreateIndex
CREATE INDEX "discovery_logs_city_created_at_idx" ON "discovery_logs"("city", "created_at");

-- CreateIndex
CREATE INDEX "discovery_logs_query_created_at_idx" ON "discovery_logs"("query", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "event_vectors_event_id_key" ON "event_vectors"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_vectors_qdrant_id_key" ON "event_vectors"("qdrant_id");

-- CreateIndex
CREATE INDEX "event_vectors_embedding_version_idx" ON "event_vectors"("embedding_version");

-- CreateIndex
CREATE INDEX "ranking_weights_version_idx" ON "ranking_weights"("version");

-- CreateIndex
CREATE INDEX "analytics_events_user_id_occurred_at_idx" ON "analytics_events"("user_id", "occurred_at");

-- CreateIndex
CREATE INDEX "analytics_events_session_id_occurred_at_idx" ON "analytics_events"("session_id", "occurred_at");

-- CreateIndex
CREATE INDEX "analytics_events_event_id_type_occurred_at_idx" ON "analytics_events"("event_id", "type", "occurred_at");

-- CreateIndex
CREATE INDEX "analytics_events_ad_campaign_id_type_occurred_at_idx" ON "analytics_events"("ad_campaign_id", "type", "occurred_at");

-- CreateIndex
CREATE INDEX "analytics_events_type_occurred_at_idx" ON "analytics_events"("type", "occurred_at");

-- CreateIndex
CREATE INDEX "analytics_events_city_occurred_at_idx" ON "analytics_events"("city", "occurred_at");

-- CreateIndex
CREATE INDEX "user_consents_user_id_idx" ON "user_consents"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_consents_session_id_key" ON "user_consents"("session_id");

-- CreateIndex
CREATE INDEX "user_interactions_user_id_event_id_idx" ON "user_interactions"("user_id", "event_id");

-- CreateIndex
CREATE INDEX "user_interactions_event_id_idx" ON "user_interactions"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_interactions_session_id_event_id_key" ON "user_interactions"("session_id", "event_id");

-- CreateIndex
CREATE INDEX "user_blocklists_user_id_idx" ON "user_blocklists"("user_id");

-- CreateIndex
CREATE INDEX "user_blocklists_session_id_idx" ON "user_blocklists"("session_id");

-- CreateIndex
CREATE INDEX "user_blocklists_venue_id_idx" ON "user_blocklists"("venue_id");

-- CreateIndex
CREATE INDEX "ad_campaigns_status_start_date_end_date_idx" ON "ad_campaigns"("status", "start_date", "end_date");

-- CreateIndex
CREATE INDEX "ad_campaigns_advertiser_idx" ON "ad_campaigns"("advertiser");

-- CreateIndex
CREATE INDEX "ad_creatives_campaign_id_status_idx" ON "ad_creatives"("campaign_id", "status");

-- CreateIndex
CREATE INDEX "ad_creatives_status_idx" ON "ad_creatives"("status");

-- CreateIndex
CREATE INDEX "ad_targetings_campaign_id_idx" ON "ad_targetings"("campaign_id");

-- CreateIndex
CREATE UNIQUE INDEX "ad_budgets_campaign_id_key" ON "ad_budgets"("campaign_id");

-- CreateIndex
CREATE INDEX "ad_impressions_campaign_id_occurred_at_idx" ON "ad_impressions"("campaign_id", "occurred_at");

-- CreateIndex
CREATE INDEX "ad_impressions_creative_id_occurred_at_idx" ON "ad_impressions"("creative_id", "occurred_at");

-- CreateIndex
CREATE INDEX "ad_impressions_session_id_occurred_at_idx" ON "ad_impressions"("session_id", "occurred_at");

-- CreateIndex
CREATE INDEX "ad_impressions_slot_occurred_at_idx" ON "ad_impressions"("slot", "occurred_at");

-- CreateIndex
CREATE INDEX "ad_clicks_impression_id_idx" ON "ad_clicks"("impression_id");

-- CreateIndex
CREATE INDEX "ad_conversions_campaign_id_occurred_at_idx" ON "ad_conversions"("campaign_id", "occurred_at");

-- CreateIndex
CREATE INDEX "ad_conversions_impression_id_idx" ON "ad_conversions"("impression_id");

-- CreateIndex
CREATE INDEX "ad_conversions_event_id_idx" ON "ad_conversions"("event_id");

-- CreateIndex
CREATE INDEX "ad_frequency_caps_campaign_id_resets_at_idx" ON "ad_frequency_caps"("campaign_id", "resets_at");

-- CreateIndex
CREATE UNIQUE INDEX "ad_frequency_caps_campaign_id_session_id_key" ON "ad_frequency_caps"("campaign_id", "session_id");

-- CreateIndex
CREATE INDEX "ad_policies_creative_id_idx" ON "ad_policies"("creative_id");

-- CreateIndex
CREATE INDEX "ad_policies_status_idx" ON "ad_policies"("status");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingest_jobs" ADD CONSTRAINT "ingest_jobs_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "search_sessions" ADD CONSTRAINT "search_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_vectors" ADD CONSTRAINT "event_vectors_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_creatives" ADD CONSTRAINT "ad_creatives_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "ad_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_targetings" ADD CONSTRAINT "ad_targetings_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "ad_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_budgets" ADD CONSTRAINT "ad_budgets_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "ad_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_impressions" ADD CONSTRAINT "ad_impressions_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "ad_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_impressions" ADD CONSTRAINT "ad_impressions_creative_id_fkey" FOREIGN KEY ("creative_id") REFERENCES "ad_creatives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_clicks" ADD CONSTRAINT "ad_clicks_impression_id_fkey" FOREIGN KEY ("impression_id") REFERENCES "ad_impressions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_conversions" ADD CONSTRAINT "ad_conversions_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "ad_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_conversions" ADD CONSTRAINT "ad_conversions_impression_id_fkey" FOREIGN KEY ("impression_id") REFERENCES "ad_impressions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
