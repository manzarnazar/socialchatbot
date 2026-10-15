-- MariaDB dump 10.19  Distrib 10.4.28-MariaDB, for osx10.10 (x86_64)
--
-- Host: localhost    Database: whatsomni_clean_prod
-- ------------------------------------------------------
-- Server version	10.4.28-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `admin_notifications`
--

DROP TABLE IF EXISTS `admin_notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `admin_notifications` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `type` varchar(255) NOT NULL,
  `title` varchar(255) NOT NULL,
  `body` text NOT NULL,
  `data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`data`)),
  `read_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `admin_notifications_read_at_index` (`read_at`),
  KEY `admin_notifications_created_at_index` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `admin_notifications`
--

LOCK TABLES `admin_notifications` WRITE;
/*!40000 ALTER TABLE `admin_notifications` DISABLE KEYS */;
/*!40000 ALTER TABLE `admin_notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ai_agent_channels`
--

DROP TABLE IF EXISTS `ai_agent_channels`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ai_agent_channels` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `ai_agent_id` bigint(20) unsigned NOT NULL,
  `channel_connection_id` bigint(20) unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `agent_channel_unique` (`ai_agent_id`,`channel_connection_id`),
  KEY `ai_agent_channels_channel_connection_id_foreign` (`channel_connection_id`),
  CONSTRAINT `ai_agent_channels_ai_agent_id_foreign` FOREIGN KEY (`ai_agent_id`) REFERENCES `ai_agents` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ai_agent_channels_channel_connection_id_foreign` FOREIGN KEY (`channel_connection_id`) REFERENCES `channel_connections` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ai_agent_channels`
--

LOCK TABLES `ai_agent_channels` WRITE;
/*!40000 ALTER TABLE `ai_agent_channels` DISABLE KEYS */;
/*!40000 ALTER TABLE `ai_agent_channels` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ai_agent_logs`
--

DROP TABLE IF EXISTS `ai_agent_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ai_agent_logs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `ai_agent_id` bigint(20) unsigned NOT NULL,
  `conversation_id` bigint(20) unsigned DEFAULT NULL,
  `request_tokens` int(11) NOT NULL DEFAULT 0,
  `response_tokens` int(11) NOT NULL DEFAULT 0,
  `estimated_cost` decimal(10,6) NOT NULL DEFAULT 0.000000,
  `model_used` varchar(255) NOT NULL,
  `latency_ms` int(10) unsigned NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `ai_agent_logs_conversation_id_foreign` (`conversation_id`),
  KEY `ai_agent_logs_ai_agent_id_created_at_index` (`ai_agent_id`,`created_at`),
  CONSTRAINT `ai_agent_logs_ai_agent_id_foreign` FOREIGN KEY (`ai_agent_id`) REFERENCES `ai_agents` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ai_agent_logs_conversation_id_foreign` FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ai_agent_logs`
--

LOCK TABLES `ai_agent_logs` WRITE;
/*!40000 ALTER TABLE `ai_agent_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `ai_agent_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ai_agents`
--

DROP TABLE IF EXISTS `ai_agents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ai_agents` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint(20) unsigned NOT NULL,
  `name` varchar(255) NOT NULL,
  `type` varchar(255) NOT NULL DEFAULT 'inbound',
  `trigger_type` varchar(50) NOT NULL DEFAULT 'inbound_message',
  `ai_provider_config_id` bigint(20) unsigned DEFAULT NULL,
  `provider` varchar(255) DEFAULT NULL,
  `model` varchar(255) DEFAULT NULL,
  `system_prompt` text DEFAULT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'active',
  `business_hours` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`business_hours`)),
  `fallback_message` text DEFAULT NULL,
  `handoff_rules` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`handoff_rules`)),
  `flow_id` bigint(20) unsigned DEFAULT NULL,
  `knowledge_base_id` bigint(20) unsigned DEFAULT NULL,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ai_agents_ai_provider_config_id_foreign` (`ai_provider_config_id`),
  KEY `ai_agents_flow_id_foreign` (`flow_id`),
  KEY `ai_agents_knowledge_base_id_foreign` (`knowledge_base_id`),
  KEY `ai_agents_created_by_foreign` (`created_by`),
  KEY `ai_agents_tenant_id_status_index` (`tenant_id`,`status`),
  CONSTRAINT `ai_agents_ai_provider_config_id_foreign` FOREIGN KEY (`ai_provider_config_id`) REFERENCES `ai_provider_configs` (`id`) ON DELETE SET NULL,
  CONSTRAINT `ai_agents_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `tenant_users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `ai_agents_flow_id_foreign` FOREIGN KEY (`flow_id`) REFERENCES `flows` (`id`) ON DELETE SET NULL,
  CONSTRAINT `ai_agents_knowledge_base_id_foreign` FOREIGN KEY (`knowledge_base_id`) REFERENCES `knowledge_bases` (`id`) ON DELETE SET NULL,
  CONSTRAINT `ai_agents_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ai_agents`
--

LOCK TABLES `ai_agents` WRITE;
/*!40000 ALTER TABLE `ai_agents` DISABLE KEYS */;
/*!40000 ALTER TABLE `ai_agents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ai_chatbot_channels`
--

DROP TABLE IF EXISTS `ai_chatbot_channels`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ai_chatbot_channels` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `ai_chatbot_id` bigint(20) unsigned NOT NULL,
  `channel_connection_id` bigint(20) unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `chatbot_channel_unique` (`ai_chatbot_id`,`channel_connection_id`),
  KEY `ai_chatbot_channels_ai_chatbot_id_index` (`ai_chatbot_id`),
  KEY `ai_chatbot_channels_channel_connection_id_index` (`channel_connection_id`),
  CONSTRAINT `ai_chatbot_channels_ai_chatbot_id_foreign` FOREIGN KEY (`ai_chatbot_id`) REFERENCES `ai_chatbots` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ai_chatbot_channels_channel_connection_id_foreign` FOREIGN KEY (`channel_connection_id`) REFERENCES `channel_connections` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ai_chatbot_channels`
--

LOCK TABLES `ai_chatbot_channels` WRITE;
/*!40000 ALTER TABLE `ai_chatbot_channels` DISABLE KEYS */;
/*!40000 ALTER TABLE `ai_chatbot_channels` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ai_chatbot_logs`
--

DROP TABLE IF EXISTS `ai_chatbot_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ai_chatbot_logs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `ai_chatbot_id` bigint(20) unsigned NOT NULL,
  `conversation_id` bigint(20) unsigned DEFAULT NULL,
  `channel_type` varchar(255) DEFAULT NULL,
  `inbound_text` text DEFAULT NULL,
  `outbound_text` longtext DEFAULT NULL,
  `rag_sources` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`rag_sources`)),
  `tool_calls` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`tool_calls`)),
  `tokens_used` int(10) unsigned NOT NULL DEFAULT 0,
  `latency_ms` int(10) unsigned NOT NULL DEFAULT 0,
  `status` varchar(255) NOT NULL DEFAULT 'success',
  `error_details` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ai_chatbot_logs_ai_chatbot_id_index` (`ai_chatbot_id`),
  KEY `ai_chatbot_logs_conversation_id_index` (`conversation_id`),
  CONSTRAINT `ai_chatbot_logs_ai_chatbot_id_foreign` FOREIGN KEY (`ai_chatbot_id`) REFERENCES `ai_chatbots` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ai_chatbot_logs_conversation_id_foreign` FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ai_chatbot_logs`
--

LOCK TABLES `ai_chatbot_logs` WRITE;
/*!40000 ALTER TABLE `ai_chatbot_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `ai_chatbot_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ai_chatbots`
--

DROP TABLE IF EXISTS `ai_chatbots`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ai_chatbots` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint(20) unsigned NOT NULL,
  `name` varchar(255) NOT NULL,
  `avatar` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `system_prompt` longtext NOT NULL,
  `temperature` decimal(3,2) NOT NULL DEFAULT 0.70,
  `ai_provider_config_id` bigint(20) unsigned DEFAULT NULL,
  `provider` varchar(255) DEFAULT NULL,
  `model` varchar(255) DEFAULT NULL,
  `knowledge_base_id` bigint(20) unsigned DEFAULT NULL,
  `ecommerce_connection_id` bigint(20) unsigned DEFAULT NULL,
  `ecommerce_settings` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`ecommerce_settings`)),
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `business_hours` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`business_hours`)),
  `fallback_message` text DEFAULT NULL,
  `handoff_rules` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`handoff_rules`)),
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ai_chatbots_tenant_id_index` (`tenant_id`),
  KEY `ai_chatbots_ai_provider_config_id_index` (`ai_provider_config_id`),
  KEY `ai_chatbots_knowledge_base_id_index` (`knowledge_base_id`),
  KEY `ai_chatbots_created_by_index` (`created_by`),
  KEY `ai_chatbots_ecommerce_connection_id_index` (`ecommerce_connection_id`),
  CONSTRAINT `ai_chatbots_ai_provider_config_id_foreign` FOREIGN KEY (`ai_provider_config_id`) REFERENCES `ai_provider_configs` (`id`) ON DELETE SET NULL,
  CONSTRAINT `ai_chatbots_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `tenant_users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `ai_chatbots_ecommerce_connection_id_foreign` FOREIGN KEY (`ecommerce_connection_id`) REFERENCES `ecommerce_connections` (`id`) ON DELETE SET NULL,
  CONSTRAINT `ai_chatbots_knowledge_base_id_foreign` FOREIGN KEY (`knowledge_base_id`) REFERENCES `knowledge_bases` (`id`) ON DELETE SET NULL,
  CONSTRAINT `ai_chatbots_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ai_chatbots`
--

LOCK TABLES `ai_chatbots` WRITE;
/*!40000 ALTER TABLE `ai_chatbots` DISABLE KEYS */;
/*!40000 ALTER TABLE `ai_chatbots` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ai_provider_configs`
--

DROP TABLE IF EXISTS `ai_provider_configs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ai_provider_configs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint(20) unsigned NOT NULL,
  `provider_name` varchar(255) NOT NULL,
  `api_key` text NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `enabled_models` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`enabled_models`)),
  `default_model` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ai_provider_configs_tenant_id_provider_name_unique` (`tenant_id`,`provider_name`),
  CONSTRAINT `ai_provider_configs_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ai_provider_configs`
--

LOCK TABLES `ai_provider_configs` WRITE;
/*!40000 ALTER TABLE `ai_provider_configs` DISABLE KEYS */;
/*!40000 ALTER TABLE `ai_provider_configs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ai_usage_logs`
--

DROP TABLE IF EXISTS `ai_usage_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ai_usage_logs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint(20) unsigned NOT NULL,
  `user_id` bigint(20) unsigned DEFAULT NULL,
  `feature` varchar(64) NOT NULL DEFAULT 'general',
  `provider` varchar(64) NOT NULL DEFAULT 'openai',
  `model` varchar(128) NOT NULL DEFAULT 'gpt-4o-mini',
  `prompt_tokens` int(10) unsigned NOT NULL DEFAULT 0,
  `completion_tokens` int(10) unsigned NOT NULL DEFAULT 0,
  `total_tokens` int(10) unsigned NOT NULL DEFAULT 0,
  `estimated_cost` decimal(10,6) NOT NULL DEFAULT 0.000000,
  `latency_ms` int(10) unsigned NOT NULL DEFAULT 0,
  `status` varchar(32) NOT NULL DEFAULT 'success',
  `error_message` text DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ai_usage_logs_tenant_id_foreign` (`tenant_id`),
  KEY `ai_usage_logs_user_id_foreign` (`user_id`),
  KEY `ai_usage_logs_created_at_tenant_id_index` (`created_at`,`tenant_id`),
  KEY `ai_usage_logs_created_at_feature_index` (`created_at`,`feature`),
  KEY `ai_usage_logs_created_at_model_index` (`created_at`,`model`),
  KEY `ai_usage_logs_feature_index` (`feature`),
  KEY `ai_usage_logs_provider_index` (`provider`),
  KEY `ai_usage_logs_model_index` (`model`),
  KEY `ai_usage_logs_status_index` (`status`),
  CONSTRAINT `ai_usage_logs_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ai_usage_logs_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `tenant_users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ai_usage_logs`
--

LOCK TABLES `ai_usage_logs` WRITE;
/*!40000 ALTER TABLE `ai_usage_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `ai_usage_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `appointments`
--

DROP TABLE IF EXISTS `appointments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `appointments` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint(20) unsigned NOT NULL,
  `contact_id` bigint(20) unsigned NOT NULL,
  `booking_link_id` bigint(20) unsigned DEFAULT NULL,
  `staff_id` bigint(20) unsigned DEFAULT NULL,
  `user_id` bigint(20) unsigned DEFAULT NULL,
  `resource_name` varchar(255) DEFAULT NULL,
  `google_event_id` varchar(255) DEFAULT NULL,
  `start_time` datetime NOT NULL,
  `end_time` datetime NOT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'scheduled',
  `notes` text DEFAULT NULL,
  `meeting_link` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `appointments_contact_id_foreign` (`contact_id`),
  KEY `appointments_booking_link_id_foreign` (`booking_link_id`),
  KEY `appointments_tenant_id_start_time_index` (`tenant_id`,`start_time`),
  KEY `appointments_user_id_foreign` (`user_id`),
  KEY `appointments_staff_id_foreign` (`staff_id`),
  CONSTRAINT `appointments_booking_link_id_foreign` FOREIGN KEY (`booking_link_id`) REFERENCES `booking_links` (`id`) ON DELETE SET NULL,
  CONSTRAINT `appointments_contact_id_foreign` FOREIGN KEY (`contact_id`) REFERENCES `contacts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `appointments_staff_id_foreign` FOREIGN KEY (`staff_id`) REFERENCES `staff_members` (`id`) ON DELETE SET NULL,
  CONSTRAINT `appointments_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `appointments_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `tenant_users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `appointments`
--

LOCK TABLES `appointments` WRITE;
/*!40000 ALTER TABLE `appointments` DISABLE KEYS */;
/*!40000 ALTER TABLE `appointments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `audit_logs`
--

DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `audit_logs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `actor_type` varchar(255) DEFAULT NULL,
  `actor_id` bigint(20) unsigned DEFAULT NULL,
  `action` varchar(255) NOT NULL,
  `subject_type` varchar(255) DEFAULT NULL,
  `subject_id` bigint(20) unsigned DEFAULT NULL,
  `meta` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`meta`)),
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_logs`
--

LOCK TABLES `audit_logs` WRITE;
/*!40000 ALTER TABLE `audit_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `audit_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `booking_links`
--

DROP TABLE IF EXISTS `booking_links`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `booking_links` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint(20) unsigned NOT NULL,
  `staff_id` bigint(20) unsigned DEFAULT NULL,
  `user_id` bigint(20) unsigned DEFAULT NULL,
  `slug` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `duration` int(11) NOT NULL DEFAULT 30,
  `buffer_before` int(11) NOT NULL DEFAULT 0,
  `buffer_after` int(11) NOT NULL DEFAULT 0,
  `working_hours` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`working_hours`)),
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `assign_mode` varchar(255) NOT NULL DEFAULT 'single',
  `resource_pool` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`resource_pool`)),
  `location_type` varchar(255) NOT NULL DEFAULT 'none',
  `custom_location` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `booking_links_tenant_id_slug_unique` (`tenant_id`,`slug`),
  KEY `booking_links_user_id_foreign` (`user_id`),
  KEY `booking_links_staff_id_foreign` (`staff_id`),
  CONSTRAINT `booking_links_staff_id_foreign` FOREIGN KEY (`staff_id`) REFERENCES `staff_members` (`id`) ON DELETE SET NULL,
  CONSTRAINT `booking_links_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `booking_links_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `tenant_users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `booking_links`
--

LOCK TABLES `booking_links` WRITE;
/*!40000 ALTER TABLE `booking_links` DISABLE KEYS */;
/*!40000 ALTER TABLE `booking_links` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cache`
--

DROP TABLE IF EXISTS `cache`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cache` (
  `key` varchar(255) NOT NULL,
  `value` mediumtext NOT NULL,
  `expiration` int(11) NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cache`
--

LOCK TABLES `cache` WRITE;
/*!40000 ALTER TABLE `cache` DISABLE KEYS */;
/*!40000 ALTER TABLE `cache` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cache_locks`
--

DROP TABLE IF EXISTS `cache_locks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cache_locks` (
  `key` varchar(255) NOT NULL,
  `owner` varchar(255) NOT NULL,
  `expiration` int(11) NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cache_locks`
--

LOCK TABLES `cache_locks` WRITE;
/*!40000 ALTER TABLE `cache_locks` DISABLE KEYS */;
/*!40000 ALTER TABLE `cache_locks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `campaign_dispatches`
--

DROP TABLE IF EXISTS `campaign_dispatches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `campaign_dispatches` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `campaign_id` bigint(20) unsigned NOT NULL,
  `contact_id` bigint(20) unsigned NOT NULL,
  `message_id` bigint(20) unsigned DEFAULT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'queued',
  `error_message` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `campaign_dispatches_contact_id_foreign` (`contact_id`),
  KEY `campaign_dispatches_message_id_foreign` (`message_id`),
  KEY `idx_campaign_dispatches_campaign_status` (`campaign_id`,`status`),
  KEY `idx_campaign_dispatches_campaign_contact` (`campaign_id`,`contact_id`),
  CONSTRAINT `campaign_dispatches_campaign_id_foreign` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns` (`id`) ON DELETE CASCADE,
  CONSTRAINT `campaign_dispatches_contact_id_foreign` FOREIGN KEY (`contact_id`) REFERENCES `contacts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `campaign_dispatches_message_id_foreign` FOREIGN KEY (`message_id`) REFERENCES `messages` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `campaign_dispatches`
--

LOCK TABLES `campaign_dispatches` WRITE;
/*!40000 ALTER TABLE `campaign_dispatches` DISABLE KEYS */;
/*!40000 ALTER TABLE `campaign_dispatches` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `campaigns`
--

DROP TABLE IF EXISTS `campaigns`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `campaigns` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint(20) unsigned NOT NULL,
  `name` varchar(255) NOT NULL,
  `channel_connection_id` bigint(20) unsigned NOT NULL,
  `audience_filter` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`audience_filter`)),
  `source_type` varchar(255) NOT NULL,
  `message_template_id` bigint(20) unsigned DEFAULT NULL,
  `custom_subject` varchar(255) DEFAULT NULL,
  `custom_message` text DEFAULT NULL,
  `media_url` varchar(1000) DEFAULT NULL,
  `media_type` varchar(50) DEFAULT 'image',
  `cta_button_text` varchar(100) DEFAULT NULL,
  `cta_button_url` varchar(1000) DEFAULT NULL,
  `ai_agent_id` bigint(20) unsigned DEFAULT NULL,
  `flow_id` bigint(20) unsigned DEFAULT NULL,
  `schedule_type` varchar(255) NOT NULL,
  `scheduled_at` timestamp NULL DEFAULT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'draft',
  `total_contacts` int(11) NOT NULL DEFAULT 0,
  `sent_count` int(11) NOT NULL DEFAULT 0,
  `delivered_count` int(11) NOT NULL DEFAULT 0,
  `read_count` int(11) NOT NULL DEFAULT 0,
  `replied_count` int(11) NOT NULL DEFAULT 0,
  `failed_count` int(11) NOT NULL DEFAULT 0,
  `error_log` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `campaigns_tenant_id_foreign` (`tenant_id`),
  KEY `campaigns_channel_connection_id_foreign` (`channel_connection_id`),
  KEY `campaigns_message_template_id_foreign` (`message_template_id`),
  KEY `campaigns_ai_agent_id_foreign` (`ai_agent_id`),
  KEY `campaigns_flow_id_foreign` (`flow_id`),
  CONSTRAINT `campaigns_ai_agent_id_foreign` FOREIGN KEY (`ai_agent_id`) REFERENCES `ai_agents` (`id`) ON DELETE CASCADE,
  CONSTRAINT `campaigns_channel_connection_id_foreign` FOREIGN KEY (`channel_connection_id`) REFERENCES `channel_connections` (`id`) ON DELETE CASCADE,
  CONSTRAINT `campaigns_flow_id_foreign` FOREIGN KEY (`flow_id`) REFERENCES `flows` (`id`) ON DELETE SET NULL,
  CONSTRAINT `campaigns_message_template_id_foreign` FOREIGN KEY (`message_template_id`) REFERENCES `message_templates` (`id`) ON DELETE CASCADE,
  CONSTRAINT `campaigns_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `campaigns`
--

LOCK TABLES `campaigns` WRITE;
/*!40000 ALTER TABLE `campaigns` DISABLE KEYS */;
/*!40000 ALTER TABLE `campaigns` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `channel_connection_tenant_user`
--

DROP TABLE IF EXISTS `channel_connection_tenant_user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `channel_connection_tenant_user` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tenant_user_id` bigint(20) unsigned NOT NULL,
  `channel_connection_id` bigint(20) unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `chan_conn_user_unique` (`tenant_user_id`,`channel_connection_id`),
  KEY `channel_connection_tenant_user_channel_connection_id_foreign` (`channel_connection_id`),
  CONSTRAINT `channel_connection_tenant_user_channel_connection_id_foreign` FOREIGN KEY (`channel_connection_id`) REFERENCES `channel_connections` (`id`) ON DELETE CASCADE,
  CONSTRAINT `channel_connection_tenant_user_tenant_user_id_foreign` FOREIGN KEY (`tenant_user_id`) REFERENCES `tenant_users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `channel_connection_tenant_user`
--

LOCK TABLES `channel_connection_tenant_user` WRITE;
/*!40000 ALTER TABLE `channel_connection_tenant_user` DISABLE KEYS */;
/*!40000 ALTER TABLE `channel_connection_tenant_user` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `channel_connections`
--

DROP TABLE IF EXISTS `channel_connections`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `channel_connections` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint(20) unsigned NOT NULL,
  `channel_type` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'connected',
  `credentials` text NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `channel_connections_tenant_id_foreign` (`tenant_id`),
  CONSTRAINT `channel_connections_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `channel_connections`
--

LOCK TABLES `channel_connections` WRITE;
/*!40000 ALTER TABLE `channel_connections` DISABLE KEYS */;
/*!40000 ALTER TABLE `channel_connections` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `contact_activities`
--

DROP TABLE IF EXISTS `contact_activities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `contact_activities` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint(20) unsigned NOT NULL,
  `contact_id` bigint(20) unsigned NOT NULL,
  `type` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `contact_activities_tenant_id_foreign` (`tenant_id`),
  KEY `contact_activities_contact_id_foreign` (`contact_id`),
  KEY `contact_activities_created_by_foreign` (`created_by`),
  CONSTRAINT `contact_activities_contact_id_foreign` FOREIGN KEY (`contact_id`) REFERENCES `contacts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `contact_activities_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `tenant_users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `contact_activities_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `contact_activities`
--

LOCK TABLES `contact_activities` WRITE;
/*!40000 ALTER TABLE `contact_activities` DISABLE KEYS */;
/*!40000 ALTER TABLE `contact_activities` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `contacts`
--

DROP TABLE IF EXISTS `contacts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `contacts` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint(20) unsigned NOT NULL,
  `first_name` varchar(255) DEFAULT NULL,
  `last_name` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(255) DEFAULT NULL,
  `lifecycle_stage` varchar(255) NOT NULL DEFAULT 'lead',
  `opted_out_channels` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`opted_out_channels`)),
  `custom_fields` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`custom_fields`)),
  `tags` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`tags`)),
  `is_muted` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `contacts_tenant_id_email_index` (`tenant_id`,`email`),
  KEY `contacts_tenant_id_phone_index` (`tenant_id`,`phone`),
  CONSTRAINT `contacts_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `contacts`
--

LOCK TABLES `contacts` WRITE;
/*!40000 ALTER TABLE `contacts` DISABLE KEYS */;
/*!40000 ALTER TABLE `contacts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `conversations`
--

DROP TABLE IF EXISTS `conversations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `conversations` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint(20) unsigned NOT NULL,
  `channel_connection_id` bigint(20) unsigned NOT NULL,
  `contact_id` bigint(20) unsigned DEFAULT NULL,
  `external_chat_id` varchar(255) NOT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'open',
  `assigned_user_id` bigint(20) unsigned DEFAULT NULL,
  `assigned_team_id` bigint(20) unsigned DEFAULT NULL,
  `ai_active` tinyint(1) NOT NULL DEFAULT 0,
  `ai_agent_id` bigint(20) unsigned DEFAULT NULL,
  `last_message_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `conversations_channel_connection_id_external_chat_id_unique` (`channel_connection_id`,`external_chat_id`),
  KEY `conversations_tenant_id_foreign` (`tenant_id`),
  KEY `conversations_contact_id_foreign` (`contact_id`),
  KEY `conversations_assigned_user_id_foreign` (`assigned_user_id`),
  KEY `conversations_assigned_team_id_foreign` (`assigned_team_id`),
  KEY `conversations_ai_agent_id_foreign` (`ai_agent_id`),
  CONSTRAINT `conversations_ai_agent_id_foreign` FOREIGN KEY (`ai_agent_id`) REFERENCES `ai_agents` (`id`) ON DELETE SET NULL,
  CONSTRAINT `conversations_assigned_team_id_foreign` FOREIGN KEY (`assigned_team_id`) REFERENCES `teams` (`id`) ON DELETE SET NULL,
  CONSTRAINT `conversations_assigned_user_id_foreign` FOREIGN KEY (`assigned_user_id`) REFERENCES `tenant_users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `conversations_channel_connection_id_foreign` FOREIGN KEY (`channel_connection_id`) REFERENCES `channel_connections` (`id`) ON DELETE CASCADE,
  CONSTRAINT `conversations_contact_id_foreign` FOREIGN KEY (`contact_id`) REFERENCES `contacts` (`id`) ON DELETE SET NULL,
  CONSTRAINT `conversations_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `conversations`
--

LOCK TABLES `conversations` WRITE;
/*!40000 ALTER TABLE `conversations` DISABLE KEYS */;
/*!40000 ALTER TABLE `conversations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `crm_integrations`
--

DROP TABLE IF EXISTS `crm_integrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `crm_integrations` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint(20) unsigned NOT NULL,
  `provider` varchar(255) NOT NULL,
  `access_token` text DEFAULT NULL,
  `refresh_token` text DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `field_mapping` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`field_mapping`)),
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `sync_direction` varchar(255) NOT NULL DEFAULT 'bidirectional',
  `last_sync_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `crm_integrations_tenant_id_provider_unique` (`tenant_id`,`provider`),
  CONSTRAINT `crm_integrations_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `crm_integrations`
--

LOCK TABLES `crm_integrations` WRITE;
/*!40000 ALTER TABLE `crm_integrations` DISABLE KEYS */;
/*!40000 ALTER TABLE `crm_integrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `crm_sync_logs`
--

DROP TABLE IF EXISTS `crm_sync_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `crm_sync_logs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint(20) unsigned NOT NULL,
  `crm_integration_id` bigint(20) unsigned NOT NULL,
  `contact_id` bigint(20) unsigned DEFAULT NULL,
  `external_id` varchar(255) DEFAULT NULL,
  `action` varchar(255) NOT NULL,
  `status` varchar(255) NOT NULL,
  `error_message` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `crm_sync_logs_tenant_id_foreign` (`tenant_id`),
  KEY `crm_sync_logs_crm_integration_id_foreign` (`crm_integration_id`),
  KEY `crm_sync_logs_contact_id_foreign` (`contact_id`),
  CONSTRAINT `crm_sync_logs_contact_id_foreign` FOREIGN KEY (`contact_id`) REFERENCES `contacts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `crm_sync_logs_crm_integration_id_foreign` FOREIGN KEY (`crm_integration_id`) REFERENCES `crm_integrations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `crm_sync_logs_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `crm_sync_logs`
--

LOCK TABLES `crm_sync_logs` WRITE;
/*!40000 ALTER TABLE `crm_sync_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `crm_sync_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `currencies`
--

DROP TABLE IF EXISTS `currencies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `currencies` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(3) NOT NULL,
  `symbol` varchar(10) NOT NULL,
  `name` varchar(50) NOT NULL,
  `payment_gateway` varchar(30) NOT NULL DEFAULT 'stripe',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `is_default` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `currencies_code_unique` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `currencies`
--

LOCK TABLES `currencies` WRITE;
/*!40000 ALTER TABLE `currencies` DISABLE KEYS */;
INSERT INTO `currencies` VALUES (1,'USD','$','US Dollar','stripe',1,0,'2026-10-06 06:01:45','2026-10-06 06:01:45',NULL),(2,'EUR','€','Euro','stripe',1,0,'2026-10-06 06:01:45','2026-10-06 06:01:45',NULL),(3,'GBP','£','British Pound','stripe',1,0,'2026-10-06 06:01:45','2026-10-06 06:01:45',NULL),(4,'INR','₹','Indian Rupee','razorpay',1,1,'2026-10-06 06:01:45','2026-10-06 06:01:45',NULL),(5,'CAD','C$','Canadian Dollar','stripe',1,0,'2026-10-06 06:01:45','2026-10-06 06:01:45',NULL),(6,'AUD','A$','Australian Dollar','stripe',1,0,'2026-10-06 06:01:45','2026-10-06 06:01:45',NULL),(7,'NGN','₦','Nigerian Naira','paystack',1,0,'2026-10-06 06:01:45','2026-10-06 06:01:45',NULL),(8,'BRL','R$','Brazilian Real','mercadopago',1,0,'2026-10-06 06:02:51','2026-10-06 06:02:51',NULL),(9,'AED','د.إ','UAE Dirham','myfatoorah',1,0,'2026-10-06 06:02:51','2026-10-06 06:02:51',NULL);
/*!40000 ALTER TABLE `currencies` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `custom_pages`
--

DROP TABLE IF EXISTS `custom_pages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `custom_pages` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `slug` varchar(255) NOT NULL,
  `title` varchar(255) NOT NULL,
  `content` longtext NOT NULL,
  `meta_description` text DEFAULT NULL,
  `is_published` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `custom_pages_slug_unique` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `custom_pages`
--

LOCK TABLES `custom_pages` WRITE;
/*!40000 ALTER TABLE `custom_pages` DISABLE KEYS */;
INSERT INTO `custom_pages` VALUES (1,'about','About Us','<h2>About WhatsOmni</h2><p>WhatsOmni is the next-generation omnichannel marketing, sales CRM, and AI automation platform built for modern businesses, agencies, and SaaS operators.</p>','Discover the story, mission, and technology behind WhatsOmni.',1,'2026-10-06 06:02:51','2026-10-06 06:02:51'),(2,'privacy','Privacy Policy','<h2>1. Data We Collect</h2><p>We collect information you provide directly to us when creating an account, connecting messaging channels, or communicating with customer support.</p><h2>2. Data Security</h2><p>All sensitive credentials and API keys are protected using AES-256 encryption at rest.</p>','Learn how WhatsOmni protects and manages your data privacy.',1,'2026-10-06 06:02:51','2026-10-06 06:02:51'),(3,'terms','Terms & Conditions','<h2>1. Acceptance of Terms</h2><p>By accessing and using WhatsOmni, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.</p><h2>2. Use of Service</h2><p>You agree to use WhatsOmni only for lawful purposes and in accordance with all applicable laws and regulations.</p>','Official terms and conditions for using WhatsOmni platform services.',1,'2026-10-06 06:02:51','2026-10-06 06:02:51');
/*!40000 ALTER TABLE `custom_pages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `deals`
--

DROP TABLE IF EXISTS `deals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `deals` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint(20) unsigned NOT NULL,
  `contact_id` bigint(20) unsigned DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `stage` varchar(255) NOT NULL DEFAULT 'lead',
  `pipeline_stage_order` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `deals_contact_id_foreign` (`contact_id`),
  KEY `deals_tenant_id_stage_index` (`tenant_id`,`stage`),
  CONSTRAINT `deals_contact_id_foreign` FOREIGN KEY (`contact_id`) REFERENCES `contacts` (`id`) ON DELETE SET NULL,
  CONSTRAINT `deals_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `deals`
--

LOCK TABLES `deals` WRITE;
/*!40000 ALTER TABLE `deals` DISABLE KEYS */;
/*!40000 ALTER TABLE `deals` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ecommerce_abandoned_carts`
--

DROP TABLE IF EXISTS `ecommerce_abandoned_carts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ecommerce_abandoned_carts` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint(20) unsigned NOT NULL,
  `ecommerce_connection_id` bigint(20) unsigned DEFAULT NULL,
  `contact_id` bigint(20) unsigned DEFAULT NULL,
  `cart_token` varchar(255) NOT NULL,
  `checkout_url` text NOT NULL,
  `total_price` decimal(10,2) NOT NULL,
  `items_summary` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`items_summary`)),
  `recovery_status` varchar(255) NOT NULL DEFAULT 'pending',
  `recovered_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ecommerce_abandoned_carts_cart_token_unique` (`cart_token`),
  KEY `ecommerce_abandoned_carts_tenant_id_foreign` (`tenant_id`),
  KEY `ecommerce_abandoned_carts_contact_id_foreign` (`contact_id`),
  KEY `ecommerce_abandoned_carts_ecommerce_connection_id_foreign` (`ecommerce_connection_id`),
  CONSTRAINT `ecommerce_abandoned_carts_contact_id_foreign` FOREIGN KEY (`contact_id`) REFERENCES `contacts` (`id`) ON DELETE SET NULL,
  CONSTRAINT `ecommerce_abandoned_carts_ecommerce_connection_id_foreign` FOREIGN KEY (`ecommerce_connection_id`) REFERENCES `ecommerce_connections` (`id`) ON DELETE SET NULL,
  CONSTRAINT `ecommerce_abandoned_carts_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ecommerce_abandoned_carts`
--

LOCK TABLES `ecommerce_abandoned_carts` WRITE;
/*!40000 ALTER TABLE `ecommerce_abandoned_carts` DISABLE KEYS */;
/*!40000 ALTER TABLE `ecommerce_abandoned_carts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ecommerce_connections`
--

DROP TABLE IF EXISTS `ecommerce_connections`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ecommerce_connections` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint(20) unsigned NOT NULL,
  `platform` varchar(255) NOT NULL,
  `store_url` varchar(255) NOT NULL,
  `credentials` text NOT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'active',
  `webhook_secret` varchar(255) DEFAULT NULL,
  `last_synced_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ecommerce_connections_tenant_id_foreign` (`tenant_id`),
  KEY `ecommerce_connections_store_url_index` (`store_url`),
  CONSTRAINT `ecommerce_connections_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ecommerce_connections`
--

LOCK TABLES `ecommerce_connections` WRITE;
/*!40000 ALTER TABLE `ecommerce_connections` DISABLE KEYS */;
/*!40000 ALTER TABLE `ecommerce_connections` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ecommerce_discounts`
--

DROP TABLE IF EXISTS `ecommerce_discounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ecommerce_discounts` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint(20) unsigned NOT NULL,
  `ecommerce_connection_id` bigint(20) unsigned DEFAULT NULL,
  `code` varchar(255) NOT NULL,
  `discount_type` varchar(255) NOT NULL DEFAULT 'percentage',
  `value` decimal(10,2) NOT NULL DEFAULT 10.00,
  `min_order_amount` decimal(10,2) DEFAULT NULL,
  `max_discount_amount` decimal(10,2) DEFAULT NULL,
  `usage_limit` int(11) DEFAULT NULL,
  `times_used` int(11) NOT NULL DEFAULT 0,
  `starts_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'active',
  `external_discount_id` varchar(255) DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ecommerce_discounts_tenant_id_foreign` (`tenant_id`),
  KEY `ecommerce_discounts_ecommerce_connection_id_foreign` (`ecommerce_connection_id`),
  KEY `ecommerce_discounts_code_index` (`code`),
  CONSTRAINT `ecommerce_discounts_ecommerce_connection_id_foreign` FOREIGN KEY (`ecommerce_connection_id`) REFERENCES `ecommerce_connections` (`id`) ON DELETE SET NULL,
  CONSTRAINT `ecommerce_discounts_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ecommerce_discounts`
--

LOCK TABLES `ecommerce_discounts` WRITE;
/*!40000 ALTER TABLE `ecommerce_discounts` DISABLE KEYS */;
/*!40000 ALTER TABLE `ecommerce_discounts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ecommerce_orders`
--

DROP TABLE IF EXISTS `ecommerce_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ecommerce_orders` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint(20) unsigned NOT NULL,
  `contact_id` bigint(20) unsigned DEFAULT NULL,
  `ecommerce_connection_id` bigint(20) unsigned NOT NULL,
  `external_order_id` varchar(255) NOT NULL,
  `order_number` varchar(255) NOT NULL,
  `customer_email` varchar(255) NOT NULL,
  `customer_name` varchar(255) DEFAULT NULL,
  `customer_phone` varchar(255) DEFAULT NULL,
  `total_price` decimal(10,2) NOT NULL,
  `subtotal_price` decimal(10,2) DEFAULT NULL,
  `total_tax` decimal(10,2) DEFAULT NULL,
  `total_discounts` decimal(10,2) DEFAULT NULL,
  `currency` varchar(10) NOT NULL DEFAULT 'USD',
  `financial_status` varchar(255) NOT NULL,
  `fulfillment_status` varchar(255) NOT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'open',
  `tracking_number` varchar(255) DEFAULT NULL,
  `tracking_url` varchar(255) DEFAULT NULL,
  `items_summary` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`items_summary`)),
  `items_count` int(11) NOT NULL DEFAULT 1,
  `line_items` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`line_items`)),
  `shipping_address` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`shipping_address`)),
  `billing_address` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`billing_address`)),
  `external_created_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ecommerce_orders_tenant_id_foreign` (`tenant_id`),
  KEY `ecommerce_orders_ecommerce_connection_id_foreign` (`ecommerce_connection_id`),
  KEY `ecommerce_orders_external_order_id_index` (`external_order_id`),
  KEY `ecommerce_orders_order_number_index` (`order_number`),
  KEY `ecommerce_orders_customer_email_index` (`customer_email`),
  KEY `ecommerce_orders_customer_phone_index` (`customer_phone`),
  KEY `ecommerce_orders_contact_id_foreign` (`contact_id`),
  CONSTRAINT `ecommerce_orders_contact_id_foreign` FOREIGN KEY (`contact_id`) REFERENCES `contacts` (`id`) ON DELETE SET NULL,
  CONSTRAINT `ecommerce_orders_ecommerce_connection_id_foreign` FOREIGN KEY (`ecommerce_connection_id`) REFERENCES `ecommerce_connections` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ecommerce_orders_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ecommerce_orders`
--

LOCK TABLES `ecommerce_orders` WRITE;
/*!40000 ALTER TABLE `ecommerce_orders` DISABLE KEYS */;
/*!40000 ALTER TABLE `ecommerce_orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ecommerce_products`
--

DROP TABLE IF EXISTS `ecommerce_products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ecommerce_products` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint(20) unsigned NOT NULL,
  `ecommerce_connection_id` bigint(20) unsigned NOT NULL,
  `external_product_id` varchar(255) NOT NULL,
  `title` varchar(255) NOT NULL,
  `handle` varchar(255) DEFAULT NULL,
  `description` longtext DEFAULT NULL,
  `price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `compare_at_price` decimal(10,2) DEFAULT NULL,
  `currency` varchar(10) NOT NULL DEFAULT 'USD',
  `sku` varchar(255) DEFAULT NULL,
  `stock_quantity` int(11) NOT NULL DEFAULT 0,
  `status` varchar(30) NOT NULL DEFAULT 'active',
  `image_url` text DEFAULT NULL,
  `images` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`images`)),
  `variants` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`variants`)),
  `categories` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`categories`)),
  `external_url` varchar(255) DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ecomm_prod_tenant_conn_ext_unique` (`tenant_id`,`ecommerce_connection_id`,`external_product_id`),
  KEY `ecommerce_products_ecommerce_connection_id_foreign` (`ecommerce_connection_id`),
  KEY `ecommerce_products_tenant_id_status_index` (`tenant_id`,`status`),
  KEY `ecommerce_products_tenant_id_price_index` (`tenant_id`,`price`),
  KEY `ecommerce_products_external_product_id_index` (`external_product_id`),
  KEY `ecommerce_products_sku_index` (`sku`),
  CONSTRAINT `ecommerce_products_ecommerce_connection_id_foreign` FOREIGN KEY (`ecommerce_connection_id`) REFERENCES `ecommerce_connections` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ecommerce_products_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ecommerce_products`
--

LOCK TABLES `ecommerce_products` WRITE;
/*!40000 ALTER TABLE `ecommerce_products` DISABLE KEYS */;
/*!40000 ALTER TABLE `ecommerce_products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `email_verification_tokens`
--

DROP TABLE IF EXISTS `email_verification_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `email_verification_tokens` (
  `email` varchar(255) NOT NULL,
  `token` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  KEY `email_verification_tokens_email_index` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `email_verification_tokens`
--

LOCK TABLES `email_verification_tokens` WRITE;
/*!40000 ALTER TABLE `email_verification_tokens` DISABLE KEYS */;
/*!40000 ALTER TABLE `email_verification_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `failed_jobs`
--

DROP TABLE IF EXISTS `failed_jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `failed_jobs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(255) NOT NULL,
  `connection` text NOT NULL,
  `queue` text NOT NULL,
  `payload` longtext NOT NULL,
  `exception` longtext NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `failed_jobs`
--

LOCK TABLES `failed_jobs` WRITE;
/*!40000 ALTER TABLE `failed_jobs` DISABLE KEYS */;
/*!40000 ALTER TABLE `failed_jobs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `flow_channels`
--

DROP TABLE IF EXISTS `flow_channels`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `flow_channels` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `flow_id` bigint(20) unsigned NOT NULL,
  `channel_connection_id` bigint(20) unsigned NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `flow_channels_flow_id_channel_connection_id_unique` (`flow_id`,`channel_connection_id`),
  KEY `flow_channels_flow_id_is_active_index` (`flow_id`,`is_active`),
  KEY `flow_channels_channel_connection_id_is_active_index` (`channel_connection_id`,`is_active`),
  CONSTRAINT `flow_channels_channel_connection_id_foreign` FOREIGN KEY (`channel_connection_id`) REFERENCES `channel_connections` (`id`) ON DELETE CASCADE,
  CONSTRAINT `flow_channels_flow_id_foreign` FOREIGN KEY (`flow_id`) REFERENCES `flows` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `flow_channels`
--

LOCK TABLES `flow_channels` WRITE;
/*!40000 ALTER TABLE `flow_channels` DISABLE KEYS */;
/*!40000 ALTER TABLE `flow_channels` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `flow_execution_logs`
--

DROP TABLE IF EXISTS `flow_execution_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `flow_execution_logs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `flow_execution_id` bigint(20) unsigned NOT NULL,
  `node_id` varchar(100) NOT NULL,
  `node_type` varchar(100) NOT NULL,
  `node_title` varchar(255) NOT NULL,
  `status` varchar(50) NOT NULL,
  `execution_time_ms` int(10) unsigned NOT NULL DEFAULT 0,
  `details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`details`)),
  `error_message` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `flow_execution_logs_flow_execution_id_index` (`flow_execution_id`),
  CONSTRAINT `flow_execution_logs_flow_execution_id_foreign` FOREIGN KEY (`flow_execution_id`) REFERENCES `flow_executions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `flow_execution_logs`
--

LOCK TABLES `flow_execution_logs` WRITE;
/*!40000 ALTER TABLE `flow_execution_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `flow_execution_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `flow_executions`
--

DROP TABLE IF EXISTS `flow_executions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `flow_executions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint(20) unsigned NOT NULL,
  `flow_version_id` bigint(20) unsigned NOT NULL,
  `contact_id` bigint(20) unsigned NOT NULL,
  `conversation_id` bigint(20) unsigned DEFAULT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'running',
  `current_node_id` varchar(100) NOT NULL,
  `context` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`context`)),
  `resume_after` timestamp NULL DEFAULT NULL,
  `last_error` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `flow_executions_tenant_id_foreign` (`tenant_id`),
  KEY `flow_executions_flow_version_id_foreign` (`flow_version_id`),
  KEY `flow_executions_contact_id_foreign` (`contact_id`),
  KEY `flow_executions_conversation_id_foreign` (`conversation_id`),
  KEY `flow_executions_status_resume_after_index` (`status`,`resume_after`),
  CONSTRAINT `flow_executions_contact_id_foreign` FOREIGN KEY (`contact_id`) REFERENCES `contacts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `flow_executions_conversation_id_foreign` FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`id`) ON DELETE SET NULL,
  CONSTRAINT `flow_executions_flow_version_id_foreign` FOREIGN KEY (`flow_version_id`) REFERENCES `flow_versions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `flow_executions_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `flow_executions`
--

LOCK TABLES `flow_executions` WRITE;
/*!40000 ALTER TABLE `flow_executions` DISABLE KEYS */;
/*!40000 ALTER TABLE `flow_executions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `flow_templates`
--

DROP TABLE IF EXISTS `flow_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `flow_templates` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `slug` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `category` varchar(255) NOT NULL DEFAULT 'General',
  `description` text DEFAULT NULL,
  `trigger_type` varchar(50) NOT NULL DEFAULT 'inbound_message',
  `trigger_keywords` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`trigger_keywords`)),
  `definition` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`definition`)),
  `nodes_count` int(10) unsigned NOT NULL DEFAULT 0,
  `is_published` tinyint(1) NOT NULL DEFAULT 1,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `flow_templates_slug_unique` (`slug`),
  KEY `flow_templates_is_published_index` (`is_published`),
  KEY `flow_templates_category_index` (`category`),
  KEY `flow_templates_sort_order_index` (`sort_order`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `flow_templates`
--

LOCK TABLES `flow_templates` WRITE;
/*!40000 ALTER TABLE `flow_templates` DISABLE KEYS */;
INSERT INTO `flow_templates` VALUES (1,'lead_qualification','Smart Lead Qualification & CRM Sync','Sales & Growth','Automated conversational lead triage, budget assessment, CRM deal creation, and VIP tagging.','inbound_message','[\"quote\",\"price\",\"pricing\",\"hire\",\"service\",\"lead\"]','{\"nodes\":[{\"id\":\"trigger_1\",\"type\":\"inbound_message\",\"position\":{\"x\":380,\"y\":50},\"data\":{\"title\":\"Inbound Lead Trigger\",\"channel\":\"all\",\"keyword\":\"quote, price, pricing, hire\",\"is_root_trigger\":true}},{\"id\":\"msg_welcome\",\"type\":\"send_message\",\"position\":{\"x\":380,\"y\":180},\"data\":{\"title\":\"Welcome Greeting\",\"body\":\"Hello! \\ud83d\\udc4b Thank you for contacting us. Let\'s find the perfect solution for your business!\"}},{\"id\":\"ask_name\",\"type\":\"ask_question\",\"position\":{\"x\":380,\"y\":310},\"data\":{\"title\":\"Ask Full Name\",\"question\":\"Could you please share your full name?\",\"questionText\":\"Could you please share your full name?\",\"saveVariable\":\"lead_name\",\"saveVariableLabel\":\"Lead Name\",\"variableDataType\":\"text\"}},{\"id\":\"ask_budget\",\"type\":\"ask_question\",\"position\":{\"x\":380,\"y\":450},\"data\":{\"title\":\"Ask Monthly Budget\",\"question\":\"What is your estimated monthly budget for this project (in USD)?\\n(e.g., 500, 1500, 5000)\",\"questionText\":\"What is your estimated monthly budget for this project (in USD)?\\n(e.g., 500, 1500, 5000)\",\"saveVariable\":\"lead_budget\",\"saveVariableLabel\":\"Lead Budget\",\"variableDataType\":\"number\"}},{\"id\":\"cond_budget\",\"type\":\"condition\",\"position\":{\"x\":380,\"y\":600},\"data\":{\"title\":\"Budget >= $1,000?\",\"operator\":\"AND\",\"conditions\":[{\"field\":\"variables.lead_budget\",\"operator\":\"greater_than_or_equal\",\"value\":\"1000\"}]}},{\"id\":\"deal_vip\",\"type\":\"create_deal\",\"position\":{\"x\":180,\"y\":750},\"data\":{\"title\":\"Create VIP Deal\",\"dealName\":\"VIP Sales Opportunity\",\"dealValue\":2500,\"stageId\":\"qualified\",\"currency\":\"USD\"}},{\"id\":\"tag_vip\",\"type\":\"tag_contact\",\"position\":{\"x\":180,\"y\":890},\"data\":{\"title\":\"Tag VIP Lead\",\"tagAction\":\"add_tag\",\"targetTag\":\"vip-qualified\"}},{\"id\":\"msg_vip\",\"type\":\"send_message\",\"position\":{\"x\":180,\"y\":1020},\"data\":{\"title\":\"VIP Fast-Track Note\",\"body\":\"Excellent, {{variables.lead_name}}! \\ud83c\\udf89 Your project fits our Enterprise tier. A senior specialist is reviewing your details and will call you within 15 minutes.\"}},{\"id\":\"tag_standard\",\"type\":\"tag_contact\",\"position\":{\"x\":580,\"y\":750},\"data\":{\"title\":\"Tag Standard Lead\",\"tagAction\":\"add_tag\",\"targetTag\":\"standard-lead\"}},{\"id\":\"msg_standard\",\"type\":\"send_message\",\"position\":{\"x\":580,\"y\":890},\"data\":{\"title\":\"Standard Catalog Note\",\"body\":\"Thank you, {{variables.lead_name}}! We have sent our starter catalog and pricing guide. Let us know if you have any questions!\"}},{\"id\":\"end_node\",\"type\":\"end_flow\",\"position\":{\"x\":380,\"y\":1180},\"data\":{\"title\":\"Conclude Journey\",\"body\":\"Lead qualification complete.\"}}],\"edges\":[{\"id\":\"e1\",\"source\":\"trigger_1\",\"target\":\"msg_welcome\",\"sourceHandle\":\"out\",\"targetHandle\":\"in\"},{\"id\":\"e2\",\"source\":\"msg_welcome\",\"target\":\"ask_name\",\"sourceHandle\":\"out\",\"targetHandle\":\"in\"},{\"id\":\"e3\",\"source\":\"ask_name\",\"target\":\"ask_budget\",\"sourceHandle\":\"out\",\"targetHandle\":\"in\"},{\"id\":\"e4\",\"source\":\"ask_budget\",\"target\":\"cond_budget\",\"sourceHandle\":\"out\",\"targetHandle\":\"in\"},{\"id\":\"e5\",\"source\":\"cond_budget\",\"target\":\"deal_vip\",\"sourceHandle\":\"true\",\"targetHandle\":\"in\"},{\"id\":\"e6\",\"source\":\"deal_vip\",\"target\":\"tag_vip\",\"sourceHandle\":\"success\",\"targetHandle\":\"in\"},{\"id\":\"e7\",\"source\":\"tag_vip\",\"target\":\"msg_vip\",\"sourceHandle\":\"out\",\"targetHandle\":\"in\"},{\"id\":\"e8\",\"source\":\"msg_vip\",\"target\":\"end_node\",\"sourceHandle\":\"out\",\"targetHandle\":\"in\"},{\"id\":\"e9\",\"source\":\"cond_budget\",\"target\":\"tag_standard\",\"sourceHandle\":\"false\",\"targetHandle\":\"in\"},{\"id\":\"e10\",\"source\":\"tag_standard\",\"target\":\"msg_standard\",\"sourceHandle\":\"out\",\"targetHandle\":\"in\"},{\"id\":\"e11\",\"source\":\"msg_standard\",\"target\":\"end_node\",\"sourceHandle\":\"out\",\"targetHandle\":\"in\"}]}',11,1,1,'2026-10-06 06:02:51','2026-10-06 06:02:51',NULL),(2,'welcome_menu','Interactive Welcome Menu with WhatsApp Quick Buttons','Engagement','Omnichannel greeting with interactive WhatsApp buttons/lists for instant booking, pricing lookup, and support.','inbound_message','[\"hi\",\"hello\",\"start\",\"menu\",\"hey\"]','{\"nodes\":[{\"id\":\"trigger_1\",\"type\":\"inbound_message\",\"position\":{\"x\":380,\"y\":50},\"data\":{\"title\":\"Inbound Greeting Trigger\",\"channel\":\"all\",\"keyword\":\"hi, hello, start, menu\",\"is_root_trigger\":true}},{\"id\":\"msg_greet\",\"type\":\"send_message\",\"position\":{\"x\":380,\"y\":180},\"data\":{\"title\":\"Welcome Greeting\",\"body\":\"Welcome to WhatsOmni! \\ud83d\\ude80 We\'re here to help you automate communications and accelerate your business.\"}},{\"id\":\"menu_interactive\",\"type\":\"interactive_menu\",\"position\":{\"x\":380,\"y\":320},\"data\":{\"title\":\"Main Options Menu\",\"menuType\":\"list\",\"buttonText\":\"View Services\",\"body\":\"Please choose one of the options below to get started:\",\"saveVariable\":\"user_choice\",\"items\":[{\"id\":\"item_0\",\"title\":\"\\ud83d\\udcc5 Book Consultation\",\"description\":\"Schedule a live 1-on-1 strategy call\",\"keywords\":\"1, book\",\"value\":\"book\"},{\"id\":\"item_1\",\"title\":\"\\ud83d\\udcbc Plans & Pricing\",\"description\":\"Explore packages and features\",\"keywords\":\"2, price\",\"value\":\"pricing\"},{\"id\":\"item_2\",\"title\":\"\\ud83d\\udcac Live Agent Support\",\"description\":\"Connect to our customer success team\",\"keywords\":\"3, support\",\"value\":\"support\"}]}},{\"id\":\"book_appointment\",\"type\":\"create_appointment\",\"position\":{\"x\":100,\"y\":520},\"data\":{\"title\":\"Schedule Call\",\"bookingDuration\":30,\"calendarProvider\":\"built_in\",\"conferenceProvider\":\"built_in\"}},{\"id\":\"msg_booked\",\"type\":\"send_message\",\"position\":{\"x\":100,\"y\":680},\"data\":{\"title\":\"Booking Confirmed\",\"body\":\"Your consultation is reserved! \\ud83d\\udcc5 Check your email and calendar for meeting details.\"}},{\"id\":\"rag_pricing\",\"type\":\"rag_query\",\"position\":{\"x\":380,\"y\":520},\"data\":{\"title\":\"Pricing Knowledgebase\",\"query\":\"Provide a clear summary of all our service plans and monthly pricing tiers.\",\"saveKey\":\"pricing_info\"}},{\"id\":\"msg_pricing\",\"type\":\"send_message\",\"position\":{\"x\":380,\"y\":680},\"data\":{\"title\":\"Send Pricing Info\",\"body\":\"Here is our current pricing overview:\\n\\n{{variables.pricing_info}}\\n\\nReply \'book\' anytime to schedule a consultation!\"}},{\"id\":\"handoff_support\",\"type\":\"human_handoff\",\"position\":{\"x\":660,\"y\":520},\"data\":{\"title\":\"Transfer to Support Agent\",\"queueTarget\":\"support_inbox\",\"internalNote\":\"Customer selected Live Agent from Main Welcome Menu\"}},{\"id\":\"end_menu\",\"type\":\"end_flow\",\"position\":{\"x\":240,\"y\":840},\"data\":{\"title\":\"Complete Session\",\"body\":\"Thank you for chatting with us!\"}}],\"edges\":[{\"id\":\"e1\",\"source\":\"trigger_1\",\"target\":\"msg_greet\",\"sourceHandle\":\"out\",\"targetHandle\":\"in\"},{\"id\":\"e2\",\"source\":\"msg_greet\",\"target\":\"menu_interactive\",\"sourceHandle\":\"out\",\"targetHandle\":\"in\"},{\"id\":\"e3\",\"source\":\"menu_interactive\",\"target\":\"book_appointment\",\"sourceHandle\":\"item_0\",\"targetHandle\":\"in\"},{\"id\":\"e4\",\"source\":\"book_appointment\",\"target\":\"msg_booked\",\"sourceHandle\":\"scheduled\",\"targetHandle\":\"in\"},{\"id\":\"e5\",\"source\":\"msg_booked\",\"target\":\"end_menu\",\"sourceHandle\":\"out\",\"targetHandle\":\"in\"},{\"id\":\"e6\",\"source\":\"menu_interactive\",\"target\":\"rag_pricing\",\"sourceHandle\":\"item_1\",\"targetHandle\":\"in\"},{\"id\":\"e7\",\"source\":\"rag_pricing\",\"target\":\"msg_pricing\",\"sourceHandle\":\"out\",\"targetHandle\":\"in\"},{\"id\":\"e8\",\"source\":\"msg_pricing\",\"target\":\"end_menu\",\"sourceHandle\":\"out\",\"targetHandle\":\"in\"},{\"id\":\"e9\",\"source\":\"menu_interactive\",\"target\":\"handoff_support\",\"sourceHandle\":\"item_2\",\"targetHandle\":\"in\"}]}',9,1,2,'2026-10-06 06:02:51','2026-10-06 06:02:51',NULL),(3,'booking_scheduler','Appointment Booking & Calendar Scheduler','Bookings','Collects topic preferences, checks slot availability, and books appointments directly to your calendar.','inbound_message','[\"book\",\"schedule\",\"calendar\",\"meeting\",\"demo\",\"call\"]','{\"nodes\":[{\"id\":\"trigger_1\",\"type\":\"inbound_message\",\"position\":{\"x\":380,\"y\":50},\"data\":{\"title\":\"Booking Keyword Trigger\",\"channel\":\"all\",\"keyword\":\"book, schedule, calendar, meeting, demo\",\"is_root_trigger\":true}},{\"id\":\"ask_topic\",\"type\":\"ask_question\",\"position\":{\"x\":380,\"y\":180},\"data\":{\"title\":\"Ask Consultation Topic\",\"question\":\"What would you like to focus on during our call?\\n(e.g., Omnichannel CRM, WhatsApp API, AI ChatBots, Custom Integration)\",\"questionText\":\"What would you like to focus on during our call?\\n(e.g., Omnichannel CRM, WhatsApp API, AI ChatBots, Custom Integration)\",\"saveVariable\":\"call_topic\",\"saveVariableLabel\":\"Call Topic\",\"variableDataType\":\"text\"}},{\"id\":\"book_slot\",\"type\":\"create_appointment\",\"position\":{\"x\":380,\"y\":340},\"data\":{\"title\":\"Book Google Calendar Slot\",\"bookingDuration\":30,\"calendarProvider\":\"google_calendar\",\"conferenceProvider\":\"google_meet\"}},{\"id\":\"deal_booking\",\"type\":\"create_deal\",\"position\":{\"x\":200,\"y\":500},\"data\":{\"title\":\"Log CRM Booking Deal\",\"dealName\":\"Scheduled Demo Call\",\"dealValue\":750,\"stageId\":\"meeting_booked\",\"currency\":\"USD\"}},{\"id\":\"msg_success\",\"type\":\"send_message\",\"position\":{\"x\":200,\"y\":650},\"data\":{\"title\":\"Confirmation Notice\",\"body\":\"You\'re all set! \\ud83d\\udcc5 Your session has been confirmed. A calendar invite with Google Meet link has been sent.\"}},{\"id\":\"msg_retry\",\"type\":\"send_message\",\"position\":{\"x\":560,\"y\":500},\"data\":{\"title\":\"Slot Unavailable Message\",\"body\":\"That slot was just booked by another customer. Let\'s connect you directly with a coordinator to secure your spot.\"}},{\"id\":\"handoff_booking\",\"type\":\"human_handoff\",\"position\":{\"x\":560,\"y\":650},\"data\":{\"title\":\"Live Booking Coordinator\",\"queueTarget\":\"booking_team\",\"internalNote\":\"Manual slot assistance needed for booking\"}}],\"edges\":[{\"id\":\"e1\",\"source\":\"trigger_1\",\"target\":\"ask_topic\",\"sourceHandle\":\"out\",\"targetHandle\":\"in\"},{\"id\":\"e2\",\"source\":\"ask_topic\",\"target\":\"book_slot\",\"sourceHandle\":\"out\",\"targetHandle\":\"in\"},{\"id\":\"e3\",\"source\":\"book_slot\",\"target\":\"deal_booking\",\"sourceHandle\":\"scheduled\",\"targetHandle\":\"in\"},{\"id\":\"e4\",\"source\":\"deal_booking\",\"target\":\"msg_success\",\"sourceHandle\":\"success\",\"targetHandle\":\"in\"},{\"id\":\"e5\",\"source\":\"book_slot\",\"target\":\"msg_retry\",\"sourceHandle\":\"unavailable\",\"targetHandle\":\"in\"},{\"id\":\"e6\",\"source\":\"msg_retry\",\"target\":\"handoff_booking\",\"sourceHandle\":\"out\",\"targetHandle\":\"in\"}]}',7,1,3,'2026-10-06 06:02:51','2026-10-06 06:02:51',NULL),(4,'cart_recovery','E-Commerce Order Status & Abandoned Cart Recovery','E-Commerce','Timed abandoned cart follow-up with incentive discount codes and instant live checkout assistance.','ecommerceCheckoutAbandoned','[\"cart\",\"order\",\"checkout\",\"discount\"]','{\"nodes\":[{\"id\":\"trigger_1\",\"type\":\"ecommerceCheckoutAbandoned\",\"position\":{\"x\":380,\"y\":50},\"data\":{\"title\":\"Abandoned Cart Webhook\",\"channel\":\"all\",\"is_root_trigger\":true}},{\"id\":\"wait_30m\",\"type\":\"wait_delay\",\"position\":{\"x\":380,\"y\":180},\"data\":{\"title\":\"Wait 30 Minutes\",\"delayType\":\"duration\",\"value\":30,\"unit\":\"minutes\"}},{\"id\":\"msg_cart\",\"type\":\"send_message\",\"position\":{\"x\":380,\"y\":310},\"data\":{\"title\":\"Cart Reminder\",\"body\":\"Hey there! \\ud83d\\uded2 We noticed you left some amazing items in your cart. Would you like a 10% discount code to complete your order right now?\"}},{\"id\":\"menu_cart\",\"type\":\"interactive_menu\",\"position\":{\"x\":380,\"y\":450},\"data\":{\"title\":\"Discount Offer Menu\",\"menuType\":\"buttons\",\"body\":\"Select an option below:\",\"saveVariable\":\"cart_action\",\"items\":[{\"id\":\"item_0\",\"title\":\"\\ud83c\\udf81 Claim 10% Off\",\"value\":\"discount\"},{\"id\":\"item_1\",\"title\":\"\\u2753 I Need Help\",\"value\":\"help\"}]}},{\"id\":\"tag_recovered\",\"type\":\"tag_contact\",\"position\":{\"x\":200,\"y\":610},\"data\":{\"title\":\"Tag Cart Recovered\",\"tagAction\":\"add_tag\",\"targetTag\":\"cart-incentivized\"}},{\"id\":\"msg_promo\",\"type\":\"send_message\",\"position\":{\"x\":200,\"y\":750},\"data\":{\"title\":\"Send Discount Code\",\"body\":\"Awesome! Use promo code *SAVE10* at checkout to take 10% off your entire order:\\n\\ud83d\\udc49 https:\\/\\/yourstore.com\\/checkout\"}},{\"id\":\"handoff_cart\",\"type\":\"human_handoff\",\"position\":{\"x\":560,\"y\":610},\"data\":{\"title\":\"Checkout Support Agent\",\"queueTarget\":\"sales_support\",\"internalNote\":\"Customer requested help with abandoned cart checkout\"}}],\"edges\":[{\"id\":\"e1\",\"source\":\"trigger_1\",\"target\":\"wait_30m\",\"sourceHandle\":\"out\",\"targetHandle\":\"in\"},{\"id\":\"e2\",\"source\":\"wait_30m\",\"target\":\"msg_cart\",\"sourceHandle\":\"resume\",\"targetHandle\":\"in\"},{\"id\":\"e3\",\"source\":\"msg_cart\",\"target\":\"menu_cart\",\"sourceHandle\":\"out\",\"targetHandle\":\"in\"},{\"id\":\"e4\",\"source\":\"menu_cart\",\"target\":\"tag_recovered\",\"sourceHandle\":\"item_0\",\"targetHandle\":\"in\"},{\"id\":\"e5\",\"source\":\"tag_recovered\",\"target\":\"msg_promo\",\"sourceHandle\":\"out\",\"targetHandle\":\"in\"},{\"id\":\"e6\",\"source\":\"menu_cart\",\"target\":\"handoff_cart\",\"sourceHandle\":\"item_1\",\"targetHandle\":\"in\"}]}',7,1,4,'2026-10-06 06:02:51','2026-10-06 06:02:51',NULL),(5,'support_triage','Customer Support Triage with Human Agent Escalation','Customer Support','AI sentiment detection, knowledge base RAG query matching, and seamless escalation to human inbox agents.','inbound_message','[\"help\",\"issue\",\"problem\",\"support\",\"broken\",\"error\"]','{\"nodes\":[{\"id\":\"trigger_1\",\"type\":\"inbound_message\",\"position\":{\"x\":380,\"y\":50},\"data\":{\"title\":\"Support Entry Trigger\",\"channel\":\"all\",\"keyword\":\"help, issue, problem, support\",\"is_root_trigger\":true}},{\"id\":\"ask_issue\",\"type\":\"ask_question\",\"position\":{\"x\":380,\"y\":180},\"data\":{\"title\":\"Ask Issue Description\",\"question\":\"Hello! Our support team is ready to assist. Please describe what you\'re experiencing in detail:\",\"questionText\":\"Hello! Our support team is ready to assist. Please describe what you\'re experiencing in detail:\",\"saveVariable\":\"issue_desc\",\"saveVariableLabel\":\"Issue Description\",\"variableDataType\":\"text\"}},{\"id\":\"ai_sentiment\",\"type\":\"ai_condition\",\"position\":{\"x\":380,\"y\":330},\"data\":{\"title\":\"Is Issue Urgent \\/ Critical?\",\"question\":\"Is the customer reporting a critical bug, payment blockage, server downtime, or expressing high frustration\\/anger?\",\"contentKey\":\"{{variables.issue_desc}}\",\"model\":\"gpt-4o-mini\"}},{\"id\":\"tag_urgent\",\"type\":\"tag_contact\",\"position\":{\"x\":180,\"y\":500},\"data\":{\"title\":\"Tag Urgent Priority\",\"tagAction\":\"add_tag\",\"targetTag\":\"priority-urgent\"}},{\"id\":\"msg_urgent\",\"type\":\"send_message\",\"position\":{\"x\":180,\"y\":640},\"data\":{\"title\":\"Urgent Notification\",\"body\":\"We understand this is critical. \\ud83d\\udea8 Connecting you immediately with our Priority Escalation team...\"}},{\"id\":\"handoff_urgent\",\"type\":\"human_handoff\",\"position\":{\"x\":180,\"y\":780},\"data\":{\"title\":\"Priority Queue Handoff\",\"queueTarget\":\"priority_inbox\",\"internalNote\":\"Urgent priority issue flagged by AI Sentiment triage\"}},{\"id\":\"rag_search\",\"type\":\"rag_query\",\"position\":{\"x\":580,\"y\":500},\"data\":{\"title\":\"Search Knowledgebase\",\"query\":\"{{variables.issue_desc}}\",\"saveKey\":\"kb_solution\"}},{\"id\":\"msg_kb\",\"type\":\"send_message\",\"position\":{\"x\":580,\"y\":640},\"data\":{\"title\":\"Send Suggested Solution\",\"body\":\"Here is what our system found to help resolve your issue:\\n\\n{{variables.kb_solution}}\\n\\nDid this solve your problem? Reply \'yes\' or \'agent\' if you still need assistance.\"}},{\"id\":\"end_support\",\"type\":\"end_flow\",\"position\":{\"x\":580,\"y\":780},\"data\":{\"title\":\"Session Resolved\",\"body\":\"Support triage concluded.\"}}],\"edges\":[{\"id\":\"e1\",\"source\":\"trigger_1\",\"target\":\"ask_issue\",\"sourceHandle\":\"out\",\"targetHandle\":\"in\"},{\"id\":\"e2\",\"source\":\"ask_issue\",\"target\":\"ai_sentiment\",\"sourceHandle\":\"out\",\"targetHandle\":\"in\"},{\"id\":\"e3\",\"source\":\"ai_sentiment\",\"target\":\"tag_urgent\",\"sourceHandle\":\"yes\",\"targetHandle\":\"in\"},{\"id\":\"e4\",\"source\":\"tag_urgent\",\"target\":\"msg_urgent\",\"sourceHandle\":\"out\",\"targetHandle\":\"in\"},{\"id\":\"e5\",\"source\":\"msg_urgent\",\"target\":\"handoff_urgent\",\"sourceHandle\":\"out\",\"targetHandle\":\"in\"},{\"id\":\"e6\",\"source\":\"ai_sentiment\",\"target\":\"rag_search\",\"sourceHandle\":\"no\",\"targetHandle\":\"in\"},{\"id\":\"e7\",\"source\":\"rag_search\",\"target\":\"msg_kb\",\"sourceHandle\":\"out\",\"targetHandle\":\"in\"},{\"id\":\"e8\",\"source\":\"msg_kb\",\"target\":\"end_support\",\"sourceHandle\":\"out\",\"targetHandle\":\"in\"}]}',9,1,5,'2026-10-06 06:02:51','2026-10-06 06:02:51',NULL);
/*!40000 ALTER TABLE `flow_templates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `flow_versions`
--

DROP TABLE IF EXISTS `flow_versions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `flow_versions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `flow_id` bigint(20) unsigned NOT NULL,
  `version_number` int(10) unsigned NOT NULL,
  `definition` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`definition`)),
  `is_published` tinyint(1) NOT NULL DEFAULT 0,
  `created_by` bigint(20) unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `flow_versions_flow_id_version_number_unique` (`flow_id`,`version_number`),
  KEY `flow_versions_created_by_foreign` (`created_by`),
  CONSTRAINT `flow_versions_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `tenant_users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `flow_versions_flow_id_foreign` FOREIGN KEY (`flow_id`) REFERENCES `flows` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `flow_versions`
--

LOCK TABLES `flow_versions` WRITE;
/*!40000 ALTER TABLE `flow_versions` DISABLE KEYS */;
/*!40000 ALTER TABLE `flow_versions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `flows`
--

DROP TABLE IF EXISTS `flows`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `flows` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint(20) unsigned NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `trigger_type` varchar(50) NOT NULL,
  `trigger_keywords` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`trigger_keywords`)),
  `channel_type` varchar(50) NOT NULL DEFAULT 'omnichannel',
  `is_active` tinyint(1) NOT NULL DEFAULT 0,
  `current_published_version_id` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `flows_tenant_id_is_active_index` (`tenant_id`,`is_active`),
  KEY `flows_current_published_version_id_foreign` (`current_published_version_id`),
  CONSTRAINT `flows_current_published_version_id_foreign` FOREIGN KEY (`current_published_version_id`) REFERENCES `flow_versions` (`id`) ON DELETE SET NULL,
  CONSTRAINT `flows_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `flows`
--

LOCK TABLES `flows` WRITE;
/*!40000 ALTER TABLE `flows` DISABLE KEYS */;
/*!40000 ALTER TABLE `flows` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `job_batches`
--

DROP TABLE IF EXISTS `job_batches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `job_batches` (
  `id` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `total_jobs` int(11) NOT NULL,
  `pending_jobs` int(11) NOT NULL,
  `failed_jobs` int(11) NOT NULL,
  `failed_job_ids` longtext NOT NULL,
  `options` mediumtext DEFAULT NULL,
  `cancelled_at` int(11) DEFAULT NULL,
  `created_at` int(11) NOT NULL,
  `finished_at` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `job_batches`
--

LOCK TABLES `job_batches` WRITE;
/*!40000 ALTER TABLE `job_batches` DISABLE KEYS */;
/*!40000 ALTER TABLE `job_batches` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `jobs`
--

DROP TABLE IF EXISTS `jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `jobs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `queue` varchar(255) NOT NULL,
  `payload` longtext NOT NULL,
  `attempts` tinyint(3) unsigned NOT NULL,
  `reserved_at` int(10) unsigned DEFAULT NULL,
  `available_at` int(10) unsigned NOT NULL,
  `created_at` int(10) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `jobs_queue_index` (`queue`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `jobs`
--

LOCK TABLES `jobs` WRITE;
/*!40000 ALTER TABLE `jobs` DISABLE KEYS */;
/*!40000 ALTER TABLE `jobs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `knowledge_bases`
--

DROP TABLE IF EXISTS `knowledge_bases`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `knowledge_bases` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint(20) unsigned NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `knowledge_bases_tenant_id_foreign` (`tenant_id`),
  CONSTRAINT `knowledge_bases_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `knowledge_bases`
--

LOCK TABLES `knowledge_bases` WRITE;
/*!40000 ALTER TABLE `knowledge_bases` DISABLE KEYS */;
/*!40000 ALTER TABLE `knowledge_bases` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `knowledge_chunks`
--

DROP TABLE IF EXISTS `knowledge_chunks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `knowledge_chunks` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `knowledge_source_id` bigint(20) unsigned NOT NULL,
  `chunk_index` int(11) NOT NULL,
  `content` longtext NOT NULL,
  `embedding` longtext NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `knowledge_chunks_knowledge_source_id_foreign` (`knowledge_source_id`),
  CONSTRAINT `knowledge_chunks_knowledge_source_id_foreign` FOREIGN KEY (`knowledge_source_id`) REFERENCES `knowledge_sources` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `knowledge_chunks`
--

LOCK TABLES `knowledge_chunks` WRITE;
/*!40000 ALTER TABLE `knowledge_chunks` DISABLE KEYS */;
/*!40000 ALTER TABLE `knowledge_chunks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `knowledge_sources`
--

DROP TABLE IF EXISTS `knowledge_sources`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `knowledge_sources` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `knowledge_base_id` bigint(20) unsigned NOT NULL,
  `source_type` varchar(255) NOT NULL,
  `source_name` varchar(255) NOT NULL,
  `source_metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`source_metadata`)),
  `status` varchar(255) NOT NULL DEFAULT 'pending',
  `error_reason` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `knowledge_sources_knowledge_base_id_foreign` (`knowledge_base_id`),
  CONSTRAINT `knowledge_sources_knowledge_base_id_foreign` FOREIGN KEY (`knowledge_base_id`) REFERENCES `knowledge_bases` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `knowledge_sources`
--

LOCK TABLES `knowledge_sources` WRITE;
/*!40000 ALTER TABLE `knowledge_sources` DISABLE KEYS */;
/*!40000 ALTER TABLE `knowledge_sources` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `message_templates`
--

DROP TABLE IF EXISTS `message_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `message_templates` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint(20) unsigned NOT NULL,
  `channel_connection_id` bigint(20) unsigned DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `type` varchar(255) NOT NULL,
  `category` varchar(255) NOT NULL DEFAULT 'utility',
  `language` varchar(255) NOT NULL DEFAULT 'en',
  `status` varchar(255) NOT NULL DEFAULT 'draft',
  `meta_template_id` varchar(255) DEFAULT NULL,
  `content` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`content`)),
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `message_templates_channel_connection_id_foreign` (`channel_connection_id`),
  KEY `message_templates_tenant_id_type_index` (`tenant_id`,`type`),
  CONSTRAINT `message_templates_channel_connection_id_foreign` FOREIGN KEY (`channel_connection_id`) REFERENCES `channel_connections` (`id`) ON DELETE SET NULL,
  CONSTRAINT `message_templates_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `message_templates`
--

LOCK TABLES `message_templates` WRITE;
/*!40000 ALTER TABLE `message_templates` DISABLE KEYS */;
/*!40000 ALTER TABLE `message_templates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `messages`
--

DROP TABLE IF EXISTS `messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `messages` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `conversation_id` bigint(20) unsigned NOT NULL,
  `direction` varchar(255) NOT NULL,
  `message_type` varchar(255) NOT NULL DEFAULT 'text',
  `sender_identifier` varchar(255) DEFAULT NULL,
  `body` text DEFAULT NULL,
  `media_url` varchar(255) DEFAULT NULL,
  `external_message_id` varchar(255) DEFAULT NULL,
  `delivery_status` varchar(255) NOT NULL DEFAULT 'sent',
  `error_message` text DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `messages_conversation_id_foreign` (`conversation_id`),
  KEY `messages_external_message_id_index` (`external_message_id`),
  CONSTRAINT `messages_conversation_id_foreign` FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `messages`
--

LOCK TABLES `messages` WRITE;
/*!40000 ALTER TABLE `messages` DISABLE KEYS */;
/*!40000 ALTER TABLE `messages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `meta_ad_accounts`
--

DROP TABLE IF EXISTS `meta_ad_accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `meta_ad_accounts` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint(20) unsigned NOT NULL,
  `meta_ad_account_id` varchar(255) NOT NULL,
  `account_name` varchar(255) NOT NULL,
  `account_status` varchar(255) NOT NULL DEFAULT 'ACTIVE',
  `currency` varchar(10) NOT NULL DEFAULT 'USD',
  `timezone_name` varchar(255) NOT NULL DEFAULT 'UTC',
  `spend_cap` decimal(14,2) DEFAULT NULL,
  `amount_spent` decimal(14,2) NOT NULL DEFAULT 0.00,
  `balance` decimal(14,2) NOT NULL DEFAULT 0.00,
  `access_token` text DEFAULT NULL,
  `is_default` tinyint(1) NOT NULL DEFAULT 0,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `meta_ad_accounts_tenant_id_meta_ad_account_id_unique` (`tenant_id`,`meta_ad_account_id`),
  KEY `meta_ad_accounts_meta_ad_account_id_index` (`meta_ad_account_id`),
  CONSTRAINT `meta_ad_accounts_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `meta_ad_accounts`
--

LOCK TABLES `meta_ad_accounts` WRITE;
/*!40000 ALTER TABLE `meta_ad_accounts` DISABLE KEYS */;
/*!40000 ALTER TABLE `meta_ad_accounts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `meta_ad_insights`
--

DROP TABLE IF EXISTS `meta_ad_insights`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `meta_ad_insights` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint(20) unsigned NOT NULL,
  `meta_ad_account_id` bigint(20) unsigned NOT NULL,
  `meta_campaign_id` bigint(20) unsigned DEFAULT NULL,
  `meta_ad_set_id` bigint(20) unsigned DEFAULT NULL,
  `meta_ad_id` bigint(20) unsigned DEFAULT NULL,
  `date` date NOT NULL,
  `impressions` bigint(20) unsigned NOT NULL DEFAULT 0,
  `reach` bigint(20) unsigned NOT NULL DEFAULT 0,
  `spend` decimal(14,2) NOT NULL DEFAULT 0.00,
  `clicks` bigint(20) unsigned NOT NULL DEFAULT 0,
  `ctr` decimal(8,4) NOT NULL DEFAULT 0.0000,
  `cpc` decimal(14,4) NOT NULL DEFAULT 0.0000,
  `cpm` decimal(14,4) NOT NULL DEFAULT 0.0000,
  `conversations_started` int(10) unsigned NOT NULL DEFAULT 0,
  `cost_per_conversation` decimal(14,4) NOT NULL DEFAULT 0.0000,
  `leads_count` int(10) unsigned NOT NULL DEFAULT 0,
  `purchases_count` int(10) unsigned NOT NULL DEFAULT 0,
  `purchase_value` decimal(14,2) NOT NULL DEFAULT 0.00,
  `roas` decimal(8,2) NOT NULL DEFAULT 0.00,
  `raw_meta_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`raw_meta_data`)),
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `meta_ad_insights_meta_ad_account_id_foreign` (`meta_ad_account_id`),
  KEY `meta_ad_insights_meta_campaign_id_foreign` (`meta_campaign_id`),
  KEY `meta_ad_insights_meta_ad_set_id_foreign` (`meta_ad_set_id`),
  KEY `meta_ad_insights_meta_ad_id_foreign` (`meta_ad_id`),
  KEY `meta_ad_insights_tenant_id_date_index` (`tenant_id`,`date`),
  KEY `meta_ad_insights_date_index` (`date`),
  CONSTRAINT `meta_ad_insights_meta_ad_account_id_foreign` FOREIGN KEY (`meta_ad_account_id`) REFERENCES `meta_ad_accounts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `meta_ad_insights_meta_ad_id_foreign` FOREIGN KEY (`meta_ad_id`) REFERENCES `meta_ads` (`id`) ON DELETE CASCADE,
  CONSTRAINT `meta_ad_insights_meta_ad_set_id_foreign` FOREIGN KEY (`meta_ad_set_id`) REFERENCES `meta_ad_sets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `meta_ad_insights_meta_campaign_id_foreign` FOREIGN KEY (`meta_campaign_id`) REFERENCES `meta_campaigns` (`id`) ON DELETE CASCADE,
  CONSTRAINT `meta_ad_insights_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `meta_ad_insights`
--

LOCK TABLES `meta_ad_insights` WRITE;
/*!40000 ALTER TABLE `meta_ad_insights` DISABLE KEYS */;
/*!40000 ALTER TABLE `meta_ad_insights` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `meta_ad_leads`
--

DROP TABLE IF EXISTS `meta_ad_leads`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `meta_ad_leads` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint(20) unsigned NOT NULL,
  `meta_ad_id` bigint(20) unsigned DEFAULT NULL,
  `meta_lead_id` varchar(255) NOT NULL,
  `meta_form_id` varchar(255) DEFAULT NULL,
  `contact_id` bigint(20) unsigned DEFAULT NULL,
  `form_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`form_data`)),
  `status` varchar(255) NOT NULL DEFAULT 'NEW',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `meta_ad_leads_tenant_id_meta_lead_id_unique` (`tenant_id`,`meta_lead_id`),
  KEY `meta_ad_leads_meta_ad_id_foreign` (`meta_ad_id`),
  KEY `meta_ad_leads_contact_id_foreign` (`contact_id`),
  KEY `meta_ad_leads_meta_lead_id_index` (`meta_lead_id`),
  CONSTRAINT `meta_ad_leads_contact_id_foreign` FOREIGN KEY (`contact_id`) REFERENCES `contacts` (`id`) ON DELETE SET NULL,
  CONSTRAINT `meta_ad_leads_meta_ad_id_foreign` FOREIGN KEY (`meta_ad_id`) REFERENCES `meta_ads` (`id`) ON DELETE SET NULL,
  CONSTRAINT `meta_ad_leads_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `meta_ad_leads`
--

LOCK TABLES `meta_ad_leads` WRITE;
/*!40000 ALTER TABLE `meta_ad_leads` DISABLE KEYS */;
/*!40000 ALTER TABLE `meta_ad_leads` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `meta_ad_sets`
--

DROP TABLE IF EXISTS `meta_ad_sets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `meta_ad_sets` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint(20) unsigned NOT NULL,
  `meta_campaign_id` bigint(20) unsigned NOT NULL,
  `meta_ad_set_id` varchar(255) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'PAUSED',
  `optimization_goal` varchar(255) NOT NULL DEFAULT 'CONVERSATIONS',
  `billing_event` varchar(255) NOT NULL DEFAULT 'IMPRESSIONS',
  `bid_amount` decimal(14,2) DEFAULT NULL,
  `daily_budget` decimal(14,2) DEFAULT NULL,
  `lifetime_budget` decimal(14,2) DEFAULT NULL,
  `start_time` timestamp NULL DEFAULT NULL,
  `end_time` timestamp NULL DEFAULT NULL,
  `destination_type` varchar(255) NOT NULL DEFAULT 'WHATSAPP',
  `whatsapp_phone_number` varchar(255) DEFAULT NULL,
  `targeting_spec` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`targeting_spec`)),
  `placements_spec` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`placements_spec`)),
  `error_message` text DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `meta_ad_sets_tenant_id_foreign` (`tenant_id`),
  KEY `meta_ad_sets_meta_campaign_id_foreign` (`meta_campaign_id`),
  KEY `meta_ad_sets_meta_ad_set_id_index` (`meta_ad_set_id`),
  CONSTRAINT `meta_ad_sets_meta_campaign_id_foreign` FOREIGN KEY (`meta_campaign_id`) REFERENCES `meta_campaigns` (`id`) ON DELETE CASCADE,
  CONSTRAINT `meta_ad_sets_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `meta_ad_sets`
--

LOCK TABLES `meta_ad_sets` WRITE;
/*!40000 ALTER TABLE `meta_ad_sets` DISABLE KEYS */;
/*!40000 ALTER TABLE `meta_ad_sets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `meta_ads`
--

DROP TABLE IF EXISTS `meta_ads`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `meta_ads` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint(20) unsigned NOT NULL,
  `meta_ad_set_id` bigint(20) unsigned NOT NULL,
  `meta_ad_id` varchar(255) DEFAULT NULL,
  `meta_creative_id` varchar(255) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'PAUSED',
  `page_id` varchar(255) DEFAULT NULL,
  `instagram_actor_id` varchar(255) DEFAULT NULL,
  `creative_type` varchar(255) NOT NULL DEFAULT 'IMAGE',
  `primary_text` text DEFAULT NULL,
  `headline` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `cta_type` varchar(255) NOT NULL DEFAULT 'SEND_WHATSAPP_MESSAGE',
  `media_urls` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`media_urls`)),
  `welcome_message` text DEFAULT NULL,
  `linked_flow_id` bigint(20) unsigned DEFAULT NULL,
  `meta_preview_url` varchar(255) DEFAULT NULL,
  `error_message` text DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `meta_ads_tenant_id_foreign` (`tenant_id`),
  KEY `meta_ads_meta_ad_set_id_foreign` (`meta_ad_set_id`),
  KEY `meta_ads_linked_flow_id_foreign` (`linked_flow_id`),
  KEY `meta_ads_meta_ad_id_index` (`meta_ad_id`),
  CONSTRAINT `meta_ads_linked_flow_id_foreign` FOREIGN KEY (`linked_flow_id`) REFERENCES `flows` (`id`) ON DELETE SET NULL,
  CONSTRAINT `meta_ads_meta_ad_set_id_foreign` FOREIGN KEY (`meta_ad_set_id`) REFERENCES `meta_ad_sets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `meta_ads_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `meta_ads`
--

LOCK TABLES `meta_ads` WRITE;
/*!40000 ALTER TABLE `meta_ads` DISABLE KEYS */;
/*!40000 ALTER TABLE `meta_ads` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `meta_campaigns`
--

DROP TABLE IF EXISTS `meta_campaigns`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `meta_campaigns` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint(20) unsigned NOT NULL,
  `meta_ad_account_id` bigint(20) unsigned NOT NULL,
  `meta_campaign_id` varchar(255) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `objective` varchar(255) NOT NULL DEFAULT 'MESSAGES',
  `buying_type` varchar(255) NOT NULL DEFAULT 'AUCTION',
  `status` varchar(255) NOT NULL DEFAULT 'PAUSED',
  `budget_mode` varchar(255) NOT NULL DEFAULT 'ABO',
  `daily_budget` decimal(14,2) DEFAULT NULL,
  `lifetime_budget` decimal(14,2) DEFAULT NULL,
  `special_ad_categories` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`special_ad_categories`)),
  `error_message` text DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `meta_campaigns_tenant_id_foreign` (`tenant_id`),
  KEY `meta_campaigns_meta_ad_account_id_foreign` (`meta_ad_account_id`),
  KEY `meta_campaigns_meta_campaign_id_index` (`meta_campaign_id`),
  CONSTRAINT `meta_campaigns_meta_ad_account_id_foreign` FOREIGN KEY (`meta_ad_account_id`) REFERENCES `meta_ad_accounts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `meta_campaigns_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `meta_campaigns`
--

LOCK TABLES `meta_campaigns` WRITE;
/*!40000 ALTER TABLE `meta_campaigns` DISABLE KEYS */;
/*!40000 ALTER TABLE `meta_campaigns` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `migrations`
--

DROP TABLE IF EXISTS `migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `migrations` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `migration` varchar(255) NOT NULL,
  `batch` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=85 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `migrations`
--

LOCK TABLES `migrations` WRITE;
/*!40000 ALTER TABLE `migrations` DISABLE KEYS */;
INSERT INTO `migrations` VALUES (1,'0001_01_01_000001_create_cache_table',1),(2,'0001_01_01_000002_create_jobs_table',1),(3,'2026_07_02_103141_create_personal_access_tokens_table',1),(4,'2026_07_08_000000_create_base_platform_tables',1),(5,'2026_07_08_000001_create_tenant_users_table',1),(6,'2026_07_09_000000_create_saas_admin_tables',1),(7,'2026_07_09_000001_add_stripe_product_id_to_plans_table',1),(8,'2026_07_09_000002_create_ai_provider_configs_table',1),(9,'2026_07_09_000003_create_rbac_and_teams_tables',1),(10,'2026_07_10_000000_create_crm_tables',1),(11,'2026_07_11_000000_create_pipeline_stages_table',1),(12,'2026_07_12_000000_create_tenant_google_tokens_table',1),(13,'2026_07_13_000000_create_channels_and_messages_tables',1),(14,'2026_07_14_000000_add_inbox_fields_to_conversations_table',1),(15,'2026_07_14_000001_create_rag_knowledge_tables',1),(16,'2026_07_15_000000_create_flows_tables',1),(17,'2026_07_15_000001_create_ai_agents_tables',1),(18,'2026_07_15_000002_create_message_templates_table',1),(19,'2026_07_15_000003_create_campaigns_tables',1),(20,'2026_07_15_095235_add_channel_type_to_flows_table',1),(21,'2026_07_15_103800_add_is_muted_to_contacts',1),(22,'2026_07_15_110140_create_crm_integrations_and_sync_logs_tables',1),(23,'2026_07_15_111737_add_metadata_to_crm_integrations_table',1),(24,'2026_07_15_160000_create_appointments_and_booking_tables',1),(25,'2026_07_15_170000_add_google_event_id_to_appointments',1),(26,'2026_07_15_180000_add_type_to_tenant_google_tokens',1),(27,'2026_07_15_190000_add_meeting_fields_to_bookings_and_appointments',1),(28,'2026_07_15_191000_create_tenant_meeting_tokens_table',1),(29,'2026_07_15_192000_backfill_type_in_tenant_google_tokens',1),(30,'2026_07_15_200000_add_language_to_tenant_users',1),(31,'2026_07_15_300000_create_notifications_table',1),(32,'2026_07_16_000000_create_support_tickets_tables',1),(33,'2026_07_18_000000_create_ecommerce_tables',1),(34,'2026_07_19_041211_create_saas_admin_settings_tables',1),(35,'2026_07_20_000001_create_admin_notifications_table',1),(36,'2026_07_21_000000_create_custom_pages_table',1),(37,'2026_08_11_170000_add_flow_id_to_campaigns_table',1),(38,'2026_08_23_000001_add_trigger_type_to_ai_agents_table',1),(39,'2026_08_23_173000_add_staff_and_resource_to_appointments_and_booking_links',1),(40,'2026_08_23_174000_create_staff_members_table',1),(41,'2026_08_23_181500_add_google_calendar_to_staff_members_table',1),(42,'2026_08_24_000001_add_flow_credits_to_plans_and_tenants',1),(43,'2026_08_24_000002_add_ai_operational_settings',1),(44,'2026_08_24_000003_add_provider_to_ai_agents_table',1),(45,'2026_08_27_000001_create_ai_chatbots_tables',1),(46,'2026_08_27_000002_create_flow_channels_table',1),(47,'2026_08_27_170000_add_custom_message_to_campaigns_table',1),(48,'2026_08_27_173000_add_media_and_cta_to_campaigns_table',1),(49,'2026_08_27_180000_create_flow_templates_table',1),(50,'2026_08_27_190000_remove_badge_from_flow_templates_table',1),(51,'2026_08_27_200000_add_granular_limits_to_plans_table',1),(52,'2026_08_28_160000_make_actor_columns_nullable_in_audit_logs_table',1),(53,'2026_08_28_170000_create_ai_usage_logs_table',1),(54,'2026_08_29_170000_add_monthly_ai_tokens_to_plans_table',1),(55,'2026_08_31_000000_add_razorpay_fields_to_billing_tables',1),(56,'2026_09_01_000000_add_paystack_fields_to_billing_tables',1),(57,'2026_09_02_000000_add_flutterwave_fields_to_billing_tables',1),(58,'2026_09_10_000001_enhance_multi_currency_and_plan_prices',1),(59,'2026_09_10_000002_add_payment_gateway_to_currencies_table',1),(60,'2026_09_10_000003_add_paypal_fields_to_billing_tables',1),(61,'2026_09_10_000004_add_channel_connection_modes_to_platform_settings',1),(62,'2026_09_11_000001_create_social_posts_tables',1),(63,'2026_09_14_100000_create_channel_assignment_tables',1),(64,'2026_09_14_110000_add_performance_indexes_to_campaign_dispatches_table',1),(65,'2026_09_14_220000_add_multi_workspace_support',1),(66,'2026_09_26_000001_add_paddle_fields_to_billing_tables',1),(67,'2026_09_27_000001_create_quick_replies_tables',1),(68,'2026_09_29_120000_create_whatsapp_flows_tables',1),(69,'2026_09_29_120001_add_metadata_to_messages_table',1),(70,'2026_09_29_150000_create_meta_ads_tables',1),(71,'2026_09_30_160000_create_ecommerce_products_table',1),(72,'2026_10_01_010000_enhance_ecommerce_orders_table',1),(73,'2026_10_01_020000_add_ecommerce_fields_to_ai_chatbots_table',1),(74,'2026_10_01_030000_create_ecommerce_discounts_table',1),(75,'2026_10_03_000001_add_copilot_credits_to_plans_and_tenants',1),(76,'2026_10_03_000002_add_ecommerce_caps_to_plans_table',1),(77,'2026_10_03_000003_add_meta_ads_caps_to_plans_table',1),(78,'2026_10_03_000004_add_monthly_messages_limit_to_plans_table',1),(79,'2026_10_03_000004_add_trial_ends_at_to_tenants_table',1),(80,'2026_10_03_210000_migrate_integration_credentials_to_encrypted_database',1),(81,'2026_10_05_150000_add_mercadopago_fields_to_billing_tables',1),(82,'2026_10_05_160000_add_myfatoorah_fields_to_billing_tables',1),(83,'2026_10_05_202000_add_extra_copilot_credits_to_tenants_table',1),(84,'2026_10_06_055046_add_ecommerce_connection_id_to_ecommerce_abandoned_carts_table',1);
/*!40000 ALTER TABLE `migrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `notifications` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint(20) unsigned NOT NULL,
  `user_id` bigint(20) unsigned NOT NULL,
  `title` varchar(255) NOT NULL,
  `body` text NOT NULL,
  `type` varchar(255) NOT NULL,
  `read_at` timestamp NULL DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `notifications_tenant_id_foreign` (`tenant_id`),
  KEY `notifications_user_id_foreign` (`user_id`),
  CONSTRAINT `notifications_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `notifications_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `tenant_users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications`
--

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `password_resets`
--

DROP TABLE IF EXISTS `password_resets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `password_resets` (
  `email` varchar(255) NOT NULL,
  `token` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  KEY `password_resets_email_index` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `password_resets`
--

LOCK TABLES `password_resets` WRITE;
/*!40000 ALTER TABLE `password_resets` DISABLE KEYS */;
/*!40000 ALTER TABLE `password_resets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `personal_access_tokens`
--

DROP TABLE IF EXISTS `personal_access_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `personal_access_tokens` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tokenable_type` varchar(255) NOT NULL,
  `tokenable_id` bigint(20) unsigned NOT NULL,
  `name` text NOT NULL,
  `token` varchar(64) NOT NULL,
  `abilities` text DEFAULT NULL,
  `last_used_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `personal_access_tokens_token_unique` (`token`),
  KEY `personal_access_tokens_tokenable_type_tokenable_id_index` (`tokenable_type`,`tokenable_id`),
  KEY `personal_access_tokens_expires_at_index` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `personal_access_tokens`
--

LOCK TABLES `personal_access_tokens` WRITE;
/*!40000 ALTER TABLE `personal_access_tokens` DISABLE KEYS */;
/*!40000 ALTER TABLE `personal_access_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pipeline_stages`
--

DROP TABLE IF EXISTS `pipeline_stages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `pipeline_stages` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint(20) unsigned NOT NULL,
  `key` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `color` varchar(255) NOT NULL DEFAULT 'bg-zinc-100 text-zinc-700',
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `pipeline_stages_tenant_id_key_unique` (`tenant_id`,`key`),
  KEY `pipeline_stages_key_index` (`key`),
  CONSTRAINT `pipeline_stages_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pipeline_stages`
--

LOCK TABLES `pipeline_stages` WRITE;
/*!40000 ALTER TABLE `pipeline_stages` DISABLE KEYS */;
/*!40000 ALTER TABLE `pipeline_stages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `plan_prices`
--

DROP TABLE IF EXISTS `plan_prices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `plan_prices` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `plan_id` bigint(20) unsigned NOT NULL,
  `currency_id` bigint(20) unsigned NOT NULL,
  `amount` int(11) NOT NULL,
  `stripe_price_id` varchar(255) DEFAULT NULL,
  `razorpay_plan_id` varchar(255) DEFAULT NULL,
  `paystack_plan_code` varchar(255) DEFAULT NULL,
  `flutterwave_plan_id` varchar(255) DEFAULT NULL,
  `paypal_plan_id` varchar(255) DEFAULT NULL,
  `paddle_price_id` varchar(255) DEFAULT NULL,
  `mercadopago_plan_id` varchar(255) DEFAULT NULL,
  `myfatoorah_plan_id` varchar(255) DEFAULT NULL,
  `billing_interval` varchar(255) NOT NULL DEFAULT 'month',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `plan_prices_stripe_price_id_unique` (`stripe_price_id`),
  KEY `plan_prices_currency_id_foreign` (`currency_id`),
  KEY `idx_plan_prices_lookup` (`plan_id`,`currency_id`,`billing_interval`),
  CONSTRAINT `plan_prices_currency_id_foreign` FOREIGN KEY (`currency_id`) REFERENCES `currencies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `plan_prices_plan_id_foreign` FOREIGN KEY (`plan_id`) REFERENCES `plans` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `plan_prices`
--

LOCK TABLES `plan_prices` WRITE;
/*!40000 ALTER TABLE `plan_prices` DISABLE KEYS */;
INSERT INTO `plan_prices` VALUES (1,1,1,1900,'price_starter_monthly',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'month','2026-10-06 06:02:51','2026-10-06 06:02:51'),(2,1,1,19000,'price_starter_yearly',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'year','2026-10-06 06:02:51','2026-10-06 06:02:51'),(3,2,1,4900,'price_professional_monthly',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'month','2026-10-06 06:02:51','2026-10-06 06:02:51'),(4,2,1,49000,'price_professional_yearly',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'year','2026-10-06 06:02:51','2026-10-06 06:02:51'),(5,3,1,9900,'price_enterprise_monthly',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'month','2026-10-06 06:02:51','2026-10-06 06:02:51'),(6,3,1,99000,'price_enterprise_yearly',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'year','2026-10-06 06:02:51','2026-10-06 06:02:51');
/*!40000 ALTER TABLE `plan_prices` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `plans`
--

DROP TABLE IF EXISTS `plans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `plans` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `stripe_product_id` varchar(255) DEFAULT NULL,
  `paddle_product_id` varchar(255) DEFAULT NULL,
  `mercadopago_plan_id` varchar(255) DEFAULT NULL,
  `myfatoorah_plan_id` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `trial_days` int(11) NOT NULL DEFAULT 0,
  `max_team_members` int(11) NOT NULL DEFAULT 1,
  `max_workspaces` int(11) NOT NULL DEFAULT 1,
  `max_campaigns` int(11) NOT NULL DEFAULT 0,
  `max_integrations` int(11) NOT NULL DEFAULT 0,
  `allowed_integrations` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`allowed_integrations`)),
  `own_crm_access` tinyint(1) NOT NULL DEFAULT 0,
  `max_channels` int(11) NOT NULL DEFAULT 0,
  `allowed_channels` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`allowed_channels`)),
  `max_automations` int(11) NOT NULL DEFAULT 0,
  `max_ecommerce_stores` int(11) NOT NULL DEFAULT 1,
  `max_ecommerce_products` int(11) NOT NULL DEFAULT 100,
  `monthly_ecommerce_orders` int(11) NOT NULL DEFAULT 100,
  `has_abandoned_cart_recovery` tinyint(1) NOT NULL DEFAULT 0,
  `has_whatsapp_checkout` tinyint(1) NOT NULL DEFAULT 0,
  `max_meta_ad_accounts` int(11) NOT NULL DEFAULT 1,
  `max_meta_campaigns` int(11) NOT NULL DEFAULT 2,
  `has_click_to_whatsapp_ads` tinyint(1) NOT NULL DEFAULT 0,
  `has_meta_lead_sync` tinyint(1) NOT NULL DEFAULT 0,
  `monthly_messages_limit` int(11) NOT NULL DEFAULT -1,
  `flow_credits` int(11) NOT NULL DEFAULT 50,
  `copilot_credits` int(11) NOT NULL DEFAULT 100,
  `monthly_ai_tokens` bigint(20) unsigned NOT NULL DEFAULT 100000,
  `has_flow_templates` tinyint(1) NOT NULL DEFAULT 1,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `plans`
--

LOCK TABLES `plans` WRITE;
/*!40000 ALTER TABLE `plans` DISABLE KEYS */;
INSERT INTO `plans` VALUES (1,'Starter','Essential omnichannel messaging, team collaboration, and automated conversational flows.',NULL,NULL,NULL,NULL,1,14,3,1,10,2,'[\"webhook\",\"zapier\"]',1,2,'[\"whatsapp\",\"telegram\"]',5,1,50,100,1,1,1,2,1,1,5000,100,500,250000,1,1,'2026-10-06 06:02:51','2026-10-06 06:02:51',NULL),(2,'Professional','Advanced AI intelligence routing, multi-channel gateways, deal pipelines, and team scalability.',NULL,NULL,NULL,NULL,1,14,10,3,50,10,'[\"webhook\",\"zapier\",\"hubspot\",\"salesforce\",\"pabbly\",\"make\"]',1,10,'[\"whatsapp\",\"telegram\",\"instagram\",\"facebook\",\"email\"]',25,3,500,1000,1,1,3,10,1,1,25000,500,2500,1000000,1,2,'2026-10-06 06:02:51','2026-10-06 06:02:51',NULL),(3,'Enterprise','High-volume throughput, custom webhooks, dedicated SLAs, unlimited scale, and priority AI execution.',NULL,NULL,NULL,NULL,1,30,50,10,-1,-1,'[\"*\"]',1,50,'[\"*\"]',-1,10,5000,10000,1,1,10,50,1,1,-1,2000,10000,5000000,1,3,'2026-10-06 06:02:51','2026-10-06 06:02:51',NULL);
/*!40000 ALTER TABLE `plans` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `platform_settings`
--

DROP TABLE IF EXISTS `platform_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `platform_settings` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `key` varchar(255) NOT NULL,
  `value` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`value`)),
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `platform_settings_key_unique` (`key`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `platform_settings`
--

LOCK TABLES `platform_settings` WRITE;
/*!40000 ALTER TABLE `platform_settings` DISABLE KEYS */;
INSERT INTO `platform_settings` VALUES (1,'ai_operational_model','\"byok\"','2026-10-06 06:02:51','2026-10-06 06:02:51',NULL),(2,'ai_providers_keys','{\"openai\":\"\",\"anthropic\":\"\",\"gemini\":\"\",\"groq\":\"\",\"deepseek\":\"\",\"xai\":\"\",\"mistral\":\"\",\"openrouter\":\"\"}','2026-10-06 06:02:51','2026-10-06 06:02:51',NULL),(3,'ai_feature_routing','{\"prompt_to_flow\":{\"provider\":\"openai\",\"model\":\"gpt-4o-mini\"},\"flow_ai_condition\":{\"provider\":\"openai\",\"model\":\"gpt-4o-mini\"},\"flow_ai_prompt\":{\"provider\":\"openai\",\"model\":\"gpt-4o-mini\"},\"flow_rag_query\":{\"provider\":\"openai\",\"model\":\"gpt-4o-mini\"},\"ai_agents\":{\"provider\":\"openai\",\"model\":\"gpt-4o-mini\"},\"inbox_smart_reply\":{\"provider\":\"openai\",\"model\":\"gpt-4o-mini\"},\"inbox_conversation_summary\":{\"provider\":\"openai\",\"model\":\"gpt-4o-mini\"},\"contact_sentiment_analysis\":{\"provider\":\"openai\",\"model\":\"gpt-4o-mini\"},\"knowledge_base_rag\":{\"provider\":\"openai\",\"model\":\"gpt-4o-mini\"},\"campaign_copywriter\":{\"provider\":\"openai\",\"model\":\"gpt-4o-mini\"}}','2026-10-06 06:02:51','2026-10-06 06:02:51',NULL),(4,'channel_connection_modes','{\"official_cloud_api\":true,\"qr_standalone_worker\":true}','2026-10-06 06:02:51','2026-10-06 06:02:51',NULL),(5,'meta_embedded_config','{\"app_id\":\"dummy-client-id-for-facebook-meta-login\",\"app_secret\":\"eyJpdiI6InBjMjdYelNjaTZFdlZ4Y2dvTklzQ0E9PSIsInZhbHVlIjoiWWRJYVMzZ3drUVhXeVlBcWxkTHYyZDlYMXdybVVNbW5KNlk3dXU0NUk2TXlRaTdKUklqUTVnTHlVV0FLZExsWSIsIm1hYyI6ImFiZDEyYWIzZDRlYTZkYjAxMGMwMDA2MjNmMDM4ZGFiMGJhNTlmY2E2N2UxMWVhMjhlNGY5ZTE3OWYxNzdiZjYiLCJ0YWciOiIifQ==\",\"whatsapp_config_id\":\"\",\"instagram_config_id\":\"\",\"messenger_config_id\":\"\"}','2026-10-06 06:01:45','2026-10-06 06:01:46',NULL),(6,'google_app_config','{\"client_id\":\"218693125765-e17d0nvimr4b2e10mdot45vmqkmcf0j6.apps.googleusercontent.com\",\"client_secret\":\"eyJpdiI6Ii83L2twbUl3ZnFTOVBBSmVyT3VYdEE9PSIsInZhbHVlIjoiNCtMNU0xbGxaY2d3dEN6WEd0b05pK2plOEZvOGgzT004N3ExYUw3dWV2b2RwZWs5NzZJcFprUTY1RTFFdzdMWSIsIm1hYyI6ImI4ZmYwODE5MjE1ZDJhN2Q2Yjg0ODhjNzM3YTYxMzcwMjcyNGIzZGFkYjQ2YjcyNzhlM2EzNTdkM2E5N2ZlZWEiLCJ0YWciOiIifQ==\",\"redirect_uri\":\"\"}','2026-10-06 06:01:46','2026-10-06 06:01:46',NULL),(7,'hubspot_app_config','{\"client_id\":\"8412daac-367e-48ad-a081-425224ffdfd5\",\"client_secret\":\"eyJpdiI6IkRGSWJmbkJkbkQ0TmJERFd6RkpUWGc9PSIsInZhbHVlIjoieUplQWd5QmNpakFBZFpQUEcvc3dNL3Nzc1hhZjBOSmRwaVR1MXF2VWJBb1ZtaWVBSlNFZzlXeWRUOXlmN0lsMSIsIm1hYyI6IjAyNTQ3MDA1YmM4MzZjYjFhZWZiNzZlNmJjNDRiZmZiMDk3OTk5MmE4MmFjNjRjZTk3ZTYzYWE5NmZjZWIwNGMiLCJ0YWciOiIifQ==\"}','2026-10-06 06:01:46','2026-10-06 06:01:46',NULL),(8,'salesforce_app_config','{\"client_id\":\"dummy-client-id-for-salesforce-crm\",\"client_secret\":\"eyJpdiI6ImQrUDZUV2ttSGtvWjc0ZGU2S3h2a0E9PSIsInZhbHVlIjoicFp2U0QrWmRTVTlLM3hIdDZjbG84b0cxcVgwSDVCU3BzaVROdnpOWDhOd0xjeGZJNUNhQTc2cUpxM2w0ZktnTCIsIm1hYyI6IjVlMTJiODkzMDRiNDljZGVmMjI1Zjg2ODRlOGI3ZDQzMGI4MmJiZTNjOGJmYjMwNzc2ZWQ1ZTA5OGEyOTlmODYiLCJ0YWciOiIifQ==\"}','2026-10-06 06:01:46','2026-10-06 06:01:46',NULL),(9,'zoho_app_config','{\"client_id\":\"dummy-client-id-for-zoho-crm\",\"client_secret\":\"eyJpdiI6ImR0TzdMSkZnTXNOMHdvdEpCczczZkE9PSIsInZhbHVlIjoiMzRQQy8xK0gwOUZCTGc1eTh3NHM4VjFCSFpTR0Zjd2tvaEZwc0lnTjNmdFVreWR5WVg5eEhsdEplQ2JzMENRSyIsIm1hYyI6Ijc3NTUxMGYyMTg3MDRhNGM5MTcyMmNmOGFlOTk3M2I2YmU4NWE4MGEwMGU2MDE1M2MyMGE1MDljNzc1MjUzZGEiLCJ0YWciOiIifQ==\"}','2026-10-06 06:01:46','2026-10-06 06:01:46',NULL),(10,'baileys_app_config','{\"worker_url\":\"http:\\/\\/127.0.0.1:5006\",\"secret_token\":\"eyJpdiI6IjlTWk5vMytZV1Zjb3g5VmcxOHFkYVE9PSIsInZhbHVlIjoibzZpSkcxUDhHMEpwQm5RcThWSDdyR05SL0RobWhzZzllYk1YSDFtTDFBVT0iLCJtYWMiOiJjNjdjZjUzZDI5NDVhOTRlNzVlZjgxZWUwYTRlZjNlOGZhMGZhZmZlYzFmYmRjMmJiMmY5Nzk2YmQwYTk2ZjBkIiwidGFnIjoiIn0=\"}','2026-10-06 06:01:46','2026-10-06 06:01:46',NULL),(11,'shopify_app_config','{\"client_id\":\"e8e688d0b9ec68b06b6b48bd31bc5cec\",\"client_secret\":\"eyJpdiI6IkFiQkdMQmNRd3dFTmt0K0d6M0Ywb3c9PSIsInZhbHVlIjoiZFd6akdVbXZWK1QyMWlIdDlEVHJOTVFiKzREWDBmMjRDeW83WTVHZFFwVFBGMi91UnAweGJYOFhyMXVIeXZ3QyIsIm1hYyI6ImU5M2NmNmM5ZmNhYzQ5ZGExNzk4YzliM2RlNjdmZDk2ZTUyOTI0M2Y1ZjczZjVjNGU1NmI2NDc2YjI4MDUwNzIiLCJ0YWciOiIifQ==\",\"scopes\":\"read_products,write_products,read_orders,read_customers,read_checkouts,read_inventory,read_draft_orders\"}','2026-10-06 06:01:46','2026-10-06 06:01:46',NULL),(12,'woocommerce_app_config','{\"app_name\":\"WhatsOmni\",\"scopes\":\"read_write\"}','2026-10-06 06:01:46','2026-10-06 06:01:46',NULL),(13,'branding_name','\"WhatsOmni\"','2026-10-06 06:02:51','2026-10-06 06:02:51',NULL),(14,'branding_tagline','\"All-in-One Omnichannel Marketing, CRM & AI Automation Platform\"','2026-10-06 06:02:51','2026-10-06 06:02:51',NULL),(15,'support_email','\"support@whatsomni.com\"','2026-10-06 06:02:51','2026-10-06 06:02:51',NULL);
/*!40000 ALTER TABLE `platform_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `quick_replies`
--

DROP TABLE IF EXISTS `quick_replies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `quick_replies` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint(20) unsigned NOT NULL,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `shortcut` varchar(100) DEFAULT NULL,
  `trigger_keywords` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`trigger_keywords`)),
  `match_type` varchar(30) NOT NULL DEFAULT 'contains',
  `channel_target_type` varchar(30) NOT NULL DEFAULT 'all',
  `body` text NOT NULL,
  `media_url` text DEFAULT NULL,
  `media_type` varchar(50) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `auto_reply_enabled` tinyint(1) NOT NULL DEFAULT 1,
  `usage_count` int(10) unsigned NOT NULL DEFAULT 0,
  `last_used_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `quick_replies_created_by_foreign` (`created_by`),
  KEY `quick_replies_tenant_id_is_active_index` (`tenant_id`,`is_active`),
  KEY `quick_replies_shortcut_index` (`shortcut`),
  KEY `quick_replies_is_active_index` (`is_active`),
  CONSTRAINT `quick_replies_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `tenant_users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `quick_replies_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `quick_replies`
--

LOCK TABLES `quick_replies` WRITE;
/*!40000 ALTER TABLE `quick_replies` DISABLE KEYS */;
/*!40000 ALTER TABLE `quick_replies` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `quick_reply_channels`
--

DROP TABLE IF EXISTS `quick_reply_channels`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `quick_reply_channels` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `quick_reply_id` bigint(20) unsigned NOT NULL,
  `channel_connection_id` bigint(20) unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `qr_channel_unique` (`quick_reply_id`,`channel_connection_id`),
  KEY `quick_reply_channels_channel_connection_id_foreign` (`channel_connection_id`),
  CONSTRAINT `quick_reply_channels_channel_connection_id_foreign` FOREIGN KEY (`channel_connection_id`) REFERENCES `channel_connections` (`id`) ON DELETE CASCADE,
  CONSTRAINT `quick_reply_channels_quick_reply_id_foreign` FOREIGN KEY (`quick_reply_id`) REFERENCES `quick_replies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `quick_reply_channels`
--

LOCK TABLES `quick_reply_channels` WRITE;
/*!40000 ALTER TABLE `quick_reply_channels` DISABLE KEYS */;
/*!40000 ALTER TABLE `quick_reply_channels` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `roles` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint(20) unsigned DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `display_name` varchar(255) NOT NULL,
  `permissions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`permissions`)),
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `roles_tenant_id_foreign` (`tenant_id`),
  CONSTRAINT `roles_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (1,NULL,'owner','Owner','{\"dashboard\":[\"view\"],\"inbox\":[\"read\",\"write\"],\"contacts\":[\"read\",\"write\"],\"campaigns\":[\"read\",\"write\"],\"flows\":[\"read\",\"write\"],\"settings\":[\"read\",\"write\"]}','2026-10-06 06:02:51','2026-10-06 06:02:51'),(2,NULL,'admin','Admin','{\"dashboard\":[\"view\"],\"inbox\":[\"read\",\"write\"],\"contacts\":[\"read\",\"write\"],\"campaigns\":[\"read\",\"write\"],\"flows\":[\"read\",\"write\"],\"settings\":[\"read\",\"write\"]}','2026-10-06 06:02:51','2026-10-06 06:02:51'),(3,NULL,'manager','Manager','{\"dashboard\":[\"view\"],\"inbox\":[\"read\",\"write\"],\"contacts\":[\"read\",\"write\"],\"campaigns\":[\"read\",\"write\"],\"flows\":[\"read\",\"write\"],\"settings\":[\"read\"]}','2026-10-06 06:02:51','2026-10-06 06:02:51'),(4,NULL,'agent','Agent','{\"dashboard\":[\"view\"],\"inbox\":[\"read\",\"write\"],\"contacts\":[\"read\"],\"campaigns\":[],\"flows\":[],\"settings\":[]}','2026-10-06 06:02:51','2026-10-06 06:02:51');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `saas_admin_invitations`
--

DROP TABLE IF EXISTS `saas_admin_invitations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `saas_admin_invitations` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `role_id` bigint(20) unsigned NOT NULL,
  `token` varchar(255) NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `saas_admin_invitations_email_unique` (`email`),
  UNIQUE KEY `saas_admin_invitations_token_unique` (`token`),
  KEY `saas_admin_invitations_role_id_foreign` (`role_id`),
  CONSTRAINT `saas_admin_invitations_role_id_foreign` FOREIGN KEY (`role_id`) REFERENCES `saas_admin_roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `saas_admin_invitations`
--

LOCK TABLES `saas_admin_invitations` WRITE;
/*!40000 ALTER TABLE `saas_admin_invitations` DISABLE KEYS */;
/*!40000 ALTER TABLE `saas_admin_invitations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `saas_admin_roles`
--

DROP TABLE IF EXISTS `saas_admin_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `saas_admin_roles` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `permissions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`permissions`)),
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `saas_admin_roles`
--

LOCK TABLES `saas_admin_roles` WRITE;
/*!40000 ALTER TABLE `saas_admin_roles` DISABLE KEYS */;
INSERT INTO `saas_admin_roles` VALUES (1,'Super Admin','[\"*\"]','2026-10-06 06:01:43','2026-10-06 06:01:43',NULL);
/*!40000 ALTER TABLE `saas_admin_roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `saas_admins`
--

DROP TABLE IF EXISTS `saas_admins`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `saas_admins` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `role_id` bigint(20) unsigned NOT NULL,
  `first_name` varchar(255) NOT NULL,
  `last_name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'active',
  `last_login_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `saas_admins_email_unique` (`email`),
  KEY `saas_admins_role_id_foreign` (`role_id`),
  CONSTRAINT `saas_admins_role_id_foreign` FOREIGN KEY (`role_id`) REFERENCES `saas_admin_roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `saas_admins`
--

LOCK TABLES `saas_admins` WRITE;
/*!40000 ALTER TABLE `saas_admins` DISABLE KEYS */;
INSERT INTO `saas_admins` VALUES (1,1,'Super','Admin','admin@whatsomni.com','$2y$12$hKVgszz/ZUvtKwo75rtubenMdid21.Qk5W54dNfNSXg3j7tRn31GO','active',NULL,'2026-10-06 06:02:51','2026-10-06 06:02:51',NULL);
/*!40000 ALTER TABLE `saas_admins` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `social_post_channels`
--

DROP TABLE IF EXISTS `social_post_channels`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `social_post_channels` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `social_post_id` bigint(20) unsigned NOT NULL,
  `channel_connection_id` bigint(20) unsigned NOT NULL,
  `platform` varchar(30) NOT NULL,
  `status` varchar(30) NOT NULL DEFAULT 'pending',
  `external_post_id` varchar(255) DEFAULT NULL,
  `permalink` varchar(500) DEFAULT NULL,
  `error_message` text DEFAULT NULL,
  `attempts` int(10) unsigned NOT NULL DEFAULT 0,
  `published_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `social_post_channels_channel_connection_id_foreign` (`channel_connection_id`),
  KEY `spc_post_channel_idx` (`social_post_id`,`channel_connection_id`),
  KEY `social_post_channels_status_index` (`status`),
  CONSTRAINT `social_post_channels_channel_connection_id_foreign` FOREIGN KEY (`channel_connection_id`) REFERENCES `channel_connections` (`id`) ON DELETE CASCADE,
  CONSTRAINT `social_post_channels_social_post_id_foreign` FOREIGN KEY (`social_post_id`) REFERENCES `social_posts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `social_post_channels`
--

LOCK TABLES `social_post_channels` WRITE;
/*!40000 ALTER TABLE `social_post_channels` DISABLE KEYS */;
/*!40000 ALTER TABLE `social_post_channels` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `social_posts`
--

DROP TABLE IF EXISTS `social_posts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `social_posts` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint(20) unsigned NOT NULL,
  `title` varchar(255) NOT NULL,
  `content` text NOT NULL,
  `media_urls` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`media_urls`)),
  `post_type` varchar(30) NOT NULL DEFAULT 'feed_post',
  `timing_type` varchar(30) NOT NULL DEFAULT 'draft',
  `scheduled_at` timestamp NULL DEFAULT NULL,
  `published_at` timestamp NULL DEFAULT NULL,
  `status` varchar(30) NOT NULL DEFAULT 'draft',
  `ai_prompt` text DEFAULT NULL,
  `ai_model` varchar(100) DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `social_posts_tenant_id_status_index` (`tenant_id`,`status`),
  KEY `social_posts_status_scheduled_at_index` (`status`,`scheduled_at`),
  CONSTRAINT `social_posts_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `social_posts`
--

LOCK TABLES `social_posts` WRITE;
/*!40000 ALTER TABLE `social_posts` DISABLE KEYS */;
/*!40000 ALTER TABLE `social_posts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `staff_members`
--

DROP TABLE IF EXISTS `staff_members`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `staff_members` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint(20) unsigned NOT NULL,
  `user_id` bigint(20) unsigned DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(255) DEFAULT NULL,
  `title` varchar(255) DEFAULT NULL,
  `type` varchar(255) NOT NULL DEFAULT 'staff',
  `color` varchar(255) DEFAULT NULL,
  `avatar_url` text DEFAULT NULL,
  `working_hours` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`working_hours`)),
  `google_calendar_id` varchar(255) DEFAULT NULL,
  `google_sync_enabled` tinyint(1) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `staff_members_user_id_foreign` (`user_id`),
  KEY `staff_members_tenant_id_type_is_active_index` (`tenant_id`,`type`,`is_active`),
  CONSTRAINT `staff_members_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `staff_members_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `tenant_users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `staff_members`
--

LOCK TABLES `staff_members` WRITE;
/*!40000 ALTER TABLE `staff_members` DISABLE KEYS */;
/*!40000 ALTER TABLE `staff_members` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `support_ticket_messages`
--

DROP TABLE IF EXISTS `support_ticket_messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `support_ticket_messages` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `support_ticket_id` bigint(20) unsigned NOT NULL,
  `user_id` bigint(20) unsigned DEFAULT NULL,
  `message` text NOT NULL,
  `is_admin_reply` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `support_ticket_messages_support_ticket_id_foreign` (`support_ticket_id`),
  KEY `support_ticket_messages_user_id_foreign` (`user_id`),
  CONSTRAINT `support_ticket_messages_support_ticket_id_foreign` FOREIGN KEY (`support_ticket_id`) REFERENCES `support_tickets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `support_ticket_messages_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `tenant_users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `support_ticket_messages`
--

LOCK TABLES `support_ticket_messages` WRITE;
/*!40000 ALTER TABLE `support_ticket_messages` DISABLE KEYS */;
/*!40000 ALTER TABLE `support_ticket_messages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `support_tickets`
--

DROP TABLE IF EXISTS `support_tickets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `support_tickets` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint(20) unsigned NOT NULL,
  `user_id` bigint(20) unsigned NOT NULL,
  `subject` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `type` varchar(255) NOT NULL DEFAULT 'general',
  `status` varchar(255) NOT NULL DEFAULT 'open',
  `priority` varchar(255) NOT NULL DEFAULT 'medium',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `support_tickets_tenant_id_foreign` (`tenant_id`),
  KEY `support_tickets_user_id_foreign` (`user_id`),
  CONSTRAINT `support_tickets_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `support_tickets_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `tenant_users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `support_tickets`
--

LOCK TABLES `support_tickets` WRITE;
/*!40000 ALTER TABLE `support_tickets` DISABLE KEYS */;
/*!40000 ALTER TABLE `support_tickets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `team_invitations`
--

DROP TABLE IF EXISTS `team_invitations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `team_invitations` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint(20) unsigned NOT NULL,
  `email` varchar(255) NOT NULL,
  `role_id` bigint(20) unsigned NOT NULL,
  `channel_access_type` varchar(255) NOT NULL DEFAULT 'all',
  `assigned_channel_ids` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`assigned_channel_ids`)),
  `team_id` bigint(20) unsigned DEFAULT NULL,
  `token` varchar(255) NOT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'pending',
  `expires_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `team_invitations_token_unique` (`token`),
  KEY `team_invitations_tenant_id_foreign` (`tenant_id`),
  KEY `team_invitations_role_id_foreign` (`role_id`),
  KEY `team_invitations_team_id_foreign` (`team_id`),
  CONSTRAINT `team_invitations_role_id_foreign` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `team_invitations_team_id_foreign` FOREIGN KEY (`team_id`) REFERENCES `teams` (`id`) ON DELETE SET NULL,
  CONSTRAINT `team_invitations_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `team_invitations`
--

LOCK TABLES `team_invitations` WRITE;
/*!40000 ALTER TABLE `team_invitations` DISABLE KEYS */;
/*!40000 ALTER TABLE `team_invitations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `team_tenant_user`
--

DROP TABLE IF EXISTS `team_tenant_user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `team_tenant_user` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tenant_user_id` bigint(20) unsigned NOT NULL,
  `team_id` bigint(20) unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `team_tenant_user_tenant_user_id_foreign` (`tenant_user_id`),
  KEY `team_tenant_user_team_id_foreign` (`team_id`),
  CONSTRAINT `team_tenant_user_team_id_foreign` FOREIGN KEY (`team_id`) REFERENCES `teams` (`id`) ON DELETE CASCADE,
  CONSTRAINT `team_tenant_user_tenant_user_id_foreign` FOREIGN KEY (`tenant_user_id`) REFERENCES `tenant_users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `team_tenant_user`
--

LOCK TABLES `team_tenant_user` WRITE;
/*!40000 ALTER TABLE `team_tenant_user` DISABLE KEYS */;
/*!40000 ALTER TABLE `team_tenant_user` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `teams`
--

DROP TABLE IF EXISTS `teams`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `teams` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint(20) unsigned NOT NULL,
  `name` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `teams_tenant_id_foreign` (`tenant_id`),
  CONSTRAINT `teams_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `teams`
--

LOCK TABLES `teams` WRITE;
/*!40000 ALTER TABLE `teams` DISABLE KEYS */;
/*!40000 ALTER TABLE `teams` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tenant_google_tokens`
--

DROP TABLE IF EXISTS `tenant_google_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tenant_google_tokens` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint(20) unsigned NOT NULL,
  `type` varchar(255) DEFAULT NULL,
  `access_token` text NOT NULL,
  `refresh_token` text DEFAULT NULL,
  `expires_at` datetime NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `tenant_google_tokens_tenant_id_foreign` (`tenant_id`),
  CONSTRAINT `tenant_google_tokens_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tenant_google_tokens`
--

LOCK TABLES `tenant_google_tokens` WRITE;
/*!40000 ALTER TABLE `tenant_google_tokens` DISABLE KEYS */;
/*!40000 ALTER TABLE `tenant_google_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tenant_meeting_tokens`
--

DROP TABLE IF EXISTS `tenant_meeting_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tenant_meeting_tokens` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint(20) unsigned NOT NULL,
  `provider` varchar(255) NOT NULL,
  `access_token` text NOT NULL,
  `refresh_token` text DEFAULT NULL,
  `expires_at` datetime NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tenant_meeting_tokens_tenant_id_provider_unique` (`tenant_id`,`provider`),
  CONSTRAINT `tenant_meeting_tokens_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tenant_meeting_tokens`
--

LOCK TABLES `tenant_meeting_tokens` WRITE;
/*!40000 ALTER TABLE `tenant_meeting_tokens` DISABLE KEYS */;
/*!40000 ALTER TABLE `tenant_meeting_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tenant_user_memberships`
--

DROP TABLE IF EXISTS `tenant_user_memberships`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tenant_user_memberships` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint(20) unsigned NOT NULL,
  `user_id` bigint(20) unsigned NOT NULL,
  `role_id` bigint(20) unsigned DEFAULT NULL,
  `is_owner` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tenant_user_memberships_tenant_id_user_id_unique` (`tenant_id`,`user_id`),
  KEY `tenant_user_memberships_user_id_foreign` (`user_id`),
  KEY `tenant_user_memberships_role_id_foreign` (`role_id`),
  CONSTRAINT `tenant_user_memberships_role_id_foreign` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE SET NULL,
  CONSTRAINT `tenant_user_memberships_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `tenant_user_memberships_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `tenant_users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tenant_user_memberships`
--

LOCK TABLES `tenant_user_memberships` WRITE;
/*!40000 ALTER TABLE `tenant_user_memberships` DISABLE KEYS */;
/*!40000 ALTER TABLE `tenant_user_memberships` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tenant_users`
--

DROP TABLE IF EXISTS `tenant_users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tenant_users` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint(20) unsigned NOT NULL,
  `first_name` varchar(255) NOT NULL,
  `last_name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role_id` bigint(20) unsigned DEFAULT NULL,
  `channel_access_type` varchar(255) NOT NULL DEFAULT 'all',
  `language` varchar(5) NOT NULL DEFAULT 'en',
  `status` varchar(255) NOT NULL DEFAULT 'pending',
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `last_login_at` timestamp NULL DEFAULT NULL,
  `remember_token` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tenant_users_email_unique` (`email`),
  KEY `tenant_users_tenant_id_foreign` (`tenant_id`),
  KEY `tenant_users_role_id_foreign` (`role_id`),
  CONSTRAINT `tenant_users_role_id_foreign` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE SET NULL,
  CONSTRAINT `tenant_users_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tenant_users`
--

LOCK TABLES `tenant_users` WRITE;
/*!40000 ALTER TABLE `tenant_users` DISABLE KEYS */;
/*!40000 ALTER TABLE `tenant_users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tenants`
--

DROP TABLE IF EXISTS `tenants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tenants` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `owner_id` bigint(20) unsigned DEFAULT NULL,
  `company_name` varchar(255) NOT NULL,
  `team_size` varchar(255) DEFAULT NULL,
  `industry_category` varchar(255) DEFAULT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'trial',
  `trial_ends_at` timestamp NULL DEFAULT NULL,
  `onboarding_step` varchar(255) NOT NULL DEFAULT '1',
  `currency_id` bigint(20) unsigned DEFAULT NULL,
  `stripe_customer_id` varchar(255) DEFAULT NULL,
  `razorpay_customer_id` varchar(255) DEFAULT NULL,
  `paystack_customer_id` varchar(255) DEFAULT NULL,
  `stripe_subscription_id` varchar(255) DEFAULT NULL,
  `razorpay_subscription_id` varchar(255) DEFAULT NULL,
  `paystack_subscription_id` varchar(255) DEFAULT NULL,
  `paystack_email_token` varchar(255) DEFAULT NULL,
  `flutterwave_customer_id` varchar(255) DEFAULT NULL,
  `flutterwave_subscription_id` varchar(255) DEFAULT NULL,
  `paypal_customer_id` varchar(255) DEFAULT NULL,
  `paypal_subscription_id` varchar(255) DEFAULT NULL,
  `paddle_customer_id` varchar(255) DEFAULT NULL,
  `paddle_subscription_id` varchar(255) DEFAULT NULL,
  `mercadopago_customer_id` varchar(255) DEFAULT NULL,
  `mercadopago_subscription_id` varchar(255) DEFAULT NULL,
  `myfatoorah_customer_id` varchar(255) DEFAULT NULL,
  `myfatoorah_subscription_id` varchar(255) DEFAULT NULL,
  `plan_id` bigint(20) unsigned DEFAULT NULL,
  `used_flow_credits` int(11) NOT NULL DEFAULT 0,
  `used_copilot_credits` int(11) NOT NULL DEFAULT 0,
  `extra_copilot_credits` int(11) NOT NULL DEFAULT 0,
  `default_language` varchar(5) NOT NULL DEFAULT 'en',
  `custom_mailer_type` varchar(255) DEFAULT NULL,
  `custom_mailer_config` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `tenants_currency_id_foreign` (`currency_id`),
  KEY `tenants_plan_id_foreign` (`plan_id`),
  KEY `tenants_owner_id_foreign` (`owner_id`),
  CONSTRAINT `tenants_currency_id_foreign` FOREIGN KEY (`currency_id`) REFERENCES `currencies` (`id`) ON DELETE SET NULL,
  CONSTRAINT `tenants_owner_id_foreign` FOREIGN KEY (`owner_id`) REFERENCES `tenant_users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `tenants_plan_id_foreign` FOREIGN KEY (`plan_id`) REFERENCES `plans` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tenants`
--

LOCK TABLES `tenants` WRITE;
/*!40000 ALTER TABLE `tenants` DISABLE KEYS */;
/*!40000 ALTER TABLE `tenants` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_sessions`
--

DROP TABLE IF EXISTS `user_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_sessions` (
  `id` varchar(255) NOT NULL,
  `user_id` bigint(20) unsigned DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `payload` longtext NOT NULL,
  `last_activity` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `user_sessions_user_id_foreign` (`user_id`),
  KEY `user_sessions_last_activity_index` (`last_activity`),
  CONSTRAINT `user_sessions_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `tenant_users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_sessions`
--

LOCK TABLES `user_sessions` WRITE;
/*!40000 ALTER TABLE `user_sessions` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `whatsapp_flow_submissions`
--

DROP TABLE IF EXISTS `whatsapp_flow_submissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `whatsapp_flow_submissions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint(20) unsigned NOT NULL,
  `whatsapp_flow_id` bigint(20) unsigned NOT NULL,
  `contact_id` bigint(20) unsigned DEFAULT NULL,
  `conversation_id` bigint(20) unsigned DEFAULT NULL,
  `channel_connection_id` bigint(20) unsigned DEFAULT NULL,
  `flow_token` varchar(255) DEFAULT NULL,
  `response_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`response_data`)),
  `field_labels` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`field_labels`)),
  `external_message_id` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `whatsapp_flow_submissions_whatsapp_flow_id_foreign` (`whatsapp_flow_id`),
  KEY `whatsapp_flow_submissions_contact_id_foreign` (`contact_id`),
  KEY `whatsapp_flow_submissions_conversation_id_foreign` (`conversation_id`),
  KEY `whatsapp_flow_submissions_channel_connection_id_foreign` (`channel_connection_id`),
  KEY `whatsapp_flow_submissions_tenant_id_whatsapp_flow_id_index` (`tenant_id`,`whatsapp_flow_id`),
  KEY `whatsapp_flow_submissions_flow_token_index` (`flow_token`),
  KEY `whatsapp_flow_submissions_external_message_id_index` (`external_message_id`),
  CONSTRAINT `whatsapp_flow_submissions_channel_connection_id_foreign` FOREIGN KEY (`channel_connection_id`) REFERENCES `channel_connections` (`id`) ON DELETE SET NULL,
  CONSTRAINT `whatsapp_flow_submissions_contact_id_foreign` FOREIGN KEY (`contact_id`) REFERENCES `contacts` (`id`) ON DELETE SET NULL,
  CONSTRAINT `whatsapp_flow_submissions_conversation_id_foreign` FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`id`) ON DELETE SET NULL,
  CONSTRAINT `whatsapp_flow_submissions_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `whatsapp_flow_submissions_whatsapp_flow_id_foreign` FOREIGN KEY (`whatsapp_flow_id`) REFERENCES `whatsapp_flows` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `whatsapp_flow_submissions`
--

LOCK TABLES `whatsapp_flow_submissions` WRITE;
/*!40000 ALTER TABLE `whatsapp_flow_submissions` DISABLE KEYS */;
/*!40000 ALTER TABLE `whatsapp_flow_submissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `whatsapp_flows`
--

DROP TABLE IF EXISTS `whatsapp_flows`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `whatsapp_flows` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint(20) unsigned NOT NULL,
  `channel_connection_id` bigint(20) unsigned DEFAULT NULL,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `meta_flow_id` varchar(255) DEFAULT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'DRAFT',
  `categories` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`categories`)),
  `flow_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`flow_json`)),
  `ui_schema` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`ui_schema`)),
  `endpoint_uri` varchar(255) DEFAULT NULL,
  `preview_url` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `sync_status` varchar(255) NOT NULL DEFAULT 'synced',
  `sync_error_message` text DEFAULT NULL,
  `submissions_count` int(10) unsigned NOT NULL DEFAULT 0,
  `last_synced_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `whatsapp_flows_channel_connection_id_foreign` (`channel_connection_id`),
  KEY `whatsapp_flows_created_by_foreign` (`created_by`),
  KEY `whatsapp_flows_tenant_id_status_index` (`tenant_id`,`status`),
  KEY `whatsapp_flows_meta_flow_id_index` (`meta_flow_id`),
  CONSTRAINT `whatsapp_flows_channel_connection_id_foreign` FOREIGN KEY (`channel_connection_id`) REFERENCES `channel_connections` (`id`) ON DELETE SET NULL,
  CONSTRAINT `whatsapp_flows_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `tenant_users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `whatsapp_flows_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `whatsapp_flows`
--

LOCK TABLES `whatsapp_flows` WRITE;
/*!40000 ALTER TABLE `whatsapp_flows` DISABLE KEYS */;
/*!40000 ALTER TABLE `whatsapp_flows` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-06 17:03:11
