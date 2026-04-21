CREATE TABLE "mirror_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mirror_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"mode" text NOT NULL,
	"topic" text NOT NULL,
	"saved_to_brain" boolean DEFAULT false NOT NULL,
	"brain_slug" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mirror_users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"gbrain_context" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mirror_users_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "mirror_messages" ADD CONSTRAINT "mirror_messages_session_id_mirror_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."mirror_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mirror_sessions" ADD CONSTRAINT "mirror_sessions_user_id_mirror_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."mirror_users"("id") ON DELETE cascade ON UPDATE no action;