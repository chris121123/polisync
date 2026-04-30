-- Fix missing ON DELETE cascades/set null for auth.users foreign keys

DO $$ 
DECLARE
    constraint_name_var text;
BEGIN

    -- 1. sessions.therapist_id
    SELECT constraint_name INTO constraint_name_var
    FROM information_schema.key_column_usage
    WHERE table_name = 'sessions' AND column_name = 'therapist_id'
    AND constraint_name LIKE '%fkey';
    
    IF constraint_name_var IS NOT NULL THEN
        EXECUTE 'ALTER TABLE sessions DROP CONSTRAINT ' || constraint_name_var;
    END IF;
    ALTER TABLE sessions ADD CONSTRAINT sessions_therapist_id_fkey FOREIGN KEY (therapist_id) REFERENCES auth.users(id) ON DELETE SET NULL;

    -- 2. session_notes.created_by
    SELECT constraint_name INTO constraint_name_var
    FROM information_schema.key_column_usage
    WHERE table_name = 'session_notes' AND column_name = 'created_by'
    AND constraint_name LIKE '%fkey';
    
    IF constraint_name_var IS NOT NULL THEN
        EXECUTE 'ALTER TABLE session_notes DROP CONSTRAINT ' || constraint_name_var;
    END IF;
    -- session_notes.created_by is NOT NULL right now, so we can't use SET NULL unless we alter the column
    ALTER TABLE session_notes ALTER COLUMN created_by DROP NOT NULL;
    ALTER TABLE session_notes ADD CONSTRAINT session_notes_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

    -- 3. attendance.marked_by
    SELECT constraint_name INTO constraint_name_var
    FROM information_schema.key_column_usage
    WHERE table_name = 'attendance' AND column_name = 'marked_by'
    AND constraint_name LIKE '%fkey';
    
    IF constraint_name_var IS NOT NULL THEN
        EXECUTE 'ALTER TABLE attendance DROP CONSTRAINT ' || constraint_name_var;
    END IF;
    ALTER TABLE attendance ALTER COLUMN marked_by DROP NOT NULL;
    ALTER TABLE attendance ADD CONSTRAINT attendance_marked_by_fkey FOREIGN KEY (marked_by) REFERENCES auth.users(id) ON DELETE SET NULL;

    -- 4. profiles.created_by
    SELECT constraint_name INTO constraint_name_var
    FROM information_schema.key_column_usage
    WHERE table_name = 'profiles' AND column_name = 'created_by'
    AND constraint_name LIKE '%fkey';
    
    IF constraint_name_var IS NOT NULL THEN
        EXECUTE 'ALTER TABLE profiles DROP CONSTRAINT ' || constraint_name_var;
    END IF;
    ALTER TABLE profiles ADD CONSTRAINT profiles_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

    -- 5. audit_logs.performed_by
    SELECT constraint_name INTO constraint_name_var
    FROM information_schema.key_column_usage
    WHERE table_name = 'audit_logs' AND column_name = 'performed_by'
    AND constraint_name LIKE '%fkey';
    
    IF constraint_name_var IS NOT NULL THEN
        EXECUTE 'ALTER TABLE audit_logs DROP CONSTRAINT ' || constraint_name_var;
    END IF;
    ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

    -- 6. audit_logs.target_user_id
    SELECT constraint_name INTO constraint_name_var
    FROM information_schema.key_column_usage
    WHERE table_name = 'audit_logs' AND column_name = 'target_user_id'
    AND constraint_name LIKE '%fkey';
    
    IF constraint_name_var IS NOT NULL THEN
        EXECUTE 'ALTER TABLE audit_logs DROP CONSTRAINT ' || constraint_name_var;
    END IF;
    ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_target_user_id_fkey FOREIGN KEY (target_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

END $$;
