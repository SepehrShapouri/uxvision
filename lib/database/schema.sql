-- UX-ray Database Schema
-- Run this in your Supabase SQL Editor to create the necessary tables

-- Scans table - stores website scan information
CREATE TABLE IF NOT EXISTS scans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
    score INTEGER CHECK (score >= 0 AND score <= 100),
    issues_found INTEGER DEFAULT 0,
    recommendations_count INTEGER DEFAULT 0,
    summary TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- UX Issues table - stores specific UX problems found during scans
CREATE TABLE IF NOT EXISTS ux_issues (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    scan_id UUID NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('layout', 'accessibility', 'conversion', 'mobile', 'performance')),
    severity TEXT NOT NULL CHECK (severity IN ('high', 'medium', 'low')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    element TEXT, -- CSS selector or element description
    impact TEXT NOT NULL,
    screenshot TEXT, -- Base64 mini-screenshot of the specific issue
    bounds_x INTEGER, -- Element position for reference
    bounds_y INTEGER,
    bounds_width INTEGER,
    bounds_height INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recommendations table - stores actionable recommendations for improvements
CREATE TABLE IF NOT EXISTS recommendations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    scan_id UUID NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
    priority TEXT NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    implementation TEXT NOT NULL, -- How to implement the recommendation
    expected_impact TEXT NOT NULL, -- Expected improvement description
    effort TEXT NOT NULL CHECK (effort IN ('low', 'medium', 'high')),
    element TEXT, -- CSS selector of element to improve
    screenshot TEXT, -- Base64 mini-screenshot showing what to improve
    is_implemented BOOLEAN DEFAULT FALSE,
    implemented_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User subscription/plan information (for future use)
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan TEXT NOT NULL CHECK (plan IN ('startup', 'growth', 'scale')),
    page_limit INTEGER NOT NULL,
    scans_per_month INTEGER NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('active', 'cancelled', 'expired')),
    stripe_subscription_id TEXT,
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id) -- One subscription per user
);

-- Scan usage tracking (for plan limits)
CREATE TABLE IF NOT EXISTS scan_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    scan_id UUID NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
    pages_scanned INTEGER DEFAULT 1,
    scan_month INTEGER NOT NULL, -- YYYYMM format for easy querying
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance (after table creation)
CREATE INDEX IF NOT EXISTS idx_scans_user_id ON scans(user_id);
CREATE INDEX IF NOT EXISTS idx_scans_created_at ON scans(created_at);
CREATE INDEX IF NOT EXISTS idx_scans_status ON scans(status);

CREATE INDEX IF NOT EXISTS idx_ux_issues_scan_id ON ux_issues(scan_id);
CREATE INDEX IF NOT EXISTS idx_ux_issues_category ON ux_issues(category);
CREATE INDEX IF NOT EXISTS idx_ux_issues_severity ON ux_issues(severity);

CREATE INDEX IF NOT EXISTS idx_recommendations_scan_id ON recommendations(scan_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_priority ON recommendations(priority);
CREATE INDEX IF NOT EXISTS idx_recommendations_effort ON recommendations(effort);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);

CREATE INDEX IF NOT EXISTS idx_scan_usage_user_id ON scan_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_scan_usage_scan_month ON scan_usage(scan_month);
CREATE INDEX IF NOT EXISTS idx_scan_usage_user_month ON scan_usage(user_id, scan_month);

-- Row Level Security (RLS) Policies
-- Enable RLS on all tables
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE ux_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_usage ENABLE ROW LEVEL SECURITY;

-- Scans policies
CREATE POLICY "Users can view their own scans" ON scans
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own scans" ON scans
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scans" ON scans
    FOR UPDATE USING (auth.uid() = user_id);

-- UX Issues policies
CREATE POLICY "Users can view issues from their scans" ON ux_issues
    FOR SELECT USING (
        scan_id IN (
            SELECT id FROM scans WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "System can create issues for user scans" ON ux_issues
    FOR INSERT WITH CHECK (
        scan_id IN (
            SELECT id FROM scans WHERE user_id = auth.uid()
        )
    );

-- Recommendations policies
CREATE POLICY "Users can view recommendations from their scans" ON recommendations
    FOR SELECT USING (
        scan_id IN (
            SELECT id FROM scans WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "System can create recommendations for user scans" ON recommendations
    FOR INSERT WITH CHECK (
        scan_id IN (
            SELECT id FROM scans WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update recommendations from their scans" ON recommendations
    FOR UPDATE USING (
        scan_id IN (
            SELECT id FROM scans WHERE user_id = auth.uid()
        )
    );

-- User subscriptions policies
CREATE POLICY "Users can view their own subscription" ON user_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription" ON user_subscriptions
    FOR UPDATE USING (auth.uid() = user_id);

-- Scan usage policies
CREATE POLICY "Users can view their own usage" ON scan_usage
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can create usage records for users" ON scan_usage
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Functions for analytics and reporting
CREATE OR REPLACE FUNCTION get_user_scan_stats(user_uuid UUID)
RETURNS TABLE (
    total_scans BIGINT,
    completed_scans BIGINT,
    avg_score NUMERIC,
    total_issues BIGINT,
    total_recommendations BIGINT,
    this_month_scans BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_scans,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_scans,
        AVG(score) FILTER (WHERE score IS NOT NULL) as avg_score,
        COALESCE(SUM(issues_found), 0) as total_issues,
        COALESCE(SUM(recommendations_count), 0) as total_recommendations,
        COUNT(*) FILTER (WHERE created_at >= date_trunc('month', now())) as this_month_scans
    FROM scans 
    WHERE user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can perform scan (based on plan limits)
CREATE OR REPLACE FUNCTION can_user_scan(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_plan TEXT;
    monthly_limit INTEGER;
    current_month_scans INTEGER;
    current_month INTEGER;
BEGIN
    -- Get current month in YYYYMM format
    current_month := EXTRACT(YEAR FROM NOW()) * 100 + EXTRACT(MONTH FROM NOW());
    
    -- Get user's plan and limits
    SELECT plan INTO user_plan 
    FROM user_subscriptions 
    WHERE user_id = user_uuid AND status = 'active';
    
    -- If no subscription, allow limited free usage
    IF user_plan IS NULL THEN
        SELECT COUNT(*) INTO current_month_scans
        FROM scans 
        WHERE user_id = user_uuid 
        AND EXTRACT(YEAR FROM created_at) * 100 + EXTRACT(MONTH FROM created_at) = current_month;
        
        RETURN current_month_scans < 3; -- Free tier: 3 scans per month
    END IF;
    
    -- Set monthly limits based on plan
    monthly_limit := CASE 
        WHEN user_plan = 'startup' THEN 50
        WHEN user_plan = 'growth' THEN 200
        WHEN user_plan = 'scale' THEN 1000
        ELSE 3
    END;
    
    -- Check current month usage
    SELECT COALESCE(SUM(pages_scanned), 0) INTO current_month_scans
    FROM scan_usage
    WHERE user_id = user_uuid AND scan_month = current_month;
    
    RETURN current_month_scans < monthly_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create usage records
CREATE OR REPLACE FUNCTION create_scan_usage_record()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO scan_usage (user_id, scan_id, pages_scanned, scan_month)
    VALUES (
        NEW.user_id,
        NEW.id,
        1, -- Single page for now
        EXTRACT(YEAR FROM NEW.created_at) * 100 + EXTRACT(MONTH FROM NEW.created_at)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_usage_on_scan
    AFTER INSERT ON scans
    FOR EACH ROW
    EXECUTE FUNCTION create_scan_usage_record();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated; 