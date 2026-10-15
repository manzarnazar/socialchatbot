<?php

namespace App\Services;

use App\Models\Tenant;
use App\Models\ChannelConnection;

class PlanLimitService
{
    /**
     * Standard channel display names for user-friendly error messages.
     */
    public const CHANNEL_LABELS = [
        'whatsapp' => 'WhatsApp Cloud API',
        'whatsapp_baileys' => 'WhatsApp Baileys (Unofficial)',
        'telegram' => 'Telegram',
        'instagram' => 'Instagram',
        'messenger' => 'Facebook Messenger',
        'sms' => 'SMS Gateway',
        'email' => 'Email',
        'live_chat' => 'Live Chat',
        'tiktok' => 'TikTok',
        'linkedin' => 'LinkedIn',
    ];

    /**
     * Standard individual integration display names.
     */
    public const INTEGRATION_LABELS = [
        'google_sheets' => 'Google Sheets',
        'google_calendar' => 'Google Calendar',
        'google' => 'Google Services',
        'shopify' => 'Shopify',
        'woocommerce' => 'WooCommerce',
        'zoom' => 'Zoom Meetings',
        'teams' => 'Microsoft Teams',
        'hubspot' => 'HubSpot CRM',
        'salesforce' => 'Salesforce CRM',
        'zoho' => 'Zoho CRM',
        'zapier' => 'Zapier Webhooks',
        'n8n' => 'n8n Automation',
        // Group fallbacks
        'ecommerce' => 'E-Commerce',
        'meetings' => 'Video Meetings',
        'crm' => 'CRM',
        'webhooks' => 'Automation Webhooks',
    ];

    /**
     * Map individual integration keys to group key for backward compatibility.
     */
    public const INTEGRATION_GROUPS = [
        'shopify' => 'ecommerce',
        'woocommerce' => 'ecommerce',
        'zoom' => 'meetings',
        'teams' => 'meetings',
        'hubspot' => 'crm',
        'salesforce' => 'crm',
        'zoho' => 'crm',
        'zapier' => 'webhooks',
        'n8n' => 'webhooks',
    ];

    public const MESSAGES = [
        'en' => [
            'CHANNEL_NOT_ALLOWED_IN_PLAN' => "The :channel channel is not included in your current subscription plan (:plan). Please upgrade your plan to unlock this channel.",
            'CHANNEL_CAP_REACHED' => "You have reached the maximum allowed :channel connections (:limit) on your :plan plan. Please upgrade your plan to add more.",
            'MAX_CHANNELS_LIMIT_REACHED' => "You have reached your total channel limit (:limit channels) for your subscription plan. Please upgrade to connect more channels.",
            'INTEGRATION_NOT_ALLOWED_IN_PLAN' => "The :integration integration is not included in your current subscription plan (:plan). Please upgrade your plan to unlock this integration.",
            'MAX_INTEGRATIONS_LIMIT_REACHED' => "You have reached your total integrations limit (:limit integrations) for your subscription plan. Please upgrade to connect more integrations.",
            'TEMPLATES_NOT_INCLUDED_IN_PLAN' => "Pre-built Flow Templates are not included in your current subscription plan (:plan). Please upgrade your plan to access template blueprints.",
            'MAX_CAMPAIGNS_LIMIT_REACHED' => "You have reached your total campaigns limit (:limit campaigns) for your subscription plan. Please upgrade to launch more campaigns.",
            'MAX_AUTOMATIONS_LIMIT_REACHED' => "You have reached your total automation flows limit (:limit automations) for your subscription plan. Please upgrade to create more automation flows.",
            'SEAT_LIMIT_REACHED' => "Seat limit reached. Upgrade your subscription plan to invite more team members.",
            'CRM_GATED' => "CRM Kanban Deals Pipeline is gated. Please upgrade your subscription tier to access deals.",
            'FLOW_CREDITS_EXHAUSTED' => "AI Flow generation credits exhausted. Upgrade your plan to receive more credits.",
            'WORKSPACE_LIMIT_REACHED' => "You have reached your total workspace limit (:limit workspaces) for your subscription plan. Please upgrade to create more workspaces.",
            'TENANT_SUSPENDED' => "Your workspace is currently suspended. Please contact support or resolve billing.",
            'MAX_ECOMMERCE_STORES_LIMIT_REACHED' => "You have reached your connected e-commerce stores limit (:limit stores) for your :plan plan. Please upgrade to connect more stores.",
            'MAX_ECOMMERCE_PRODUCTS_LIMIT_REACHED' => "You have reached your product catalog limit (:limit products) for your :plan plan. Please upgrade to sync more products.",
            'MONTHLY_ECOMMERCE_ORDERS_LIMIT_REACHED' => "You have reached your monthly order processing limit (:limit orders) for your :plan plan. Please upgrade to process more orders.",
            'ABANDONED_CART_RECOVERY_NOT_IN_PLAN' => "Automated WhatsApp Abandoned Cart Recovery is not included in your :plan plan. Please upgrade your plan to unlock this feature.",
            'WHATSAPP_CHECKOUT_NOT_IN_PLAN' => "Native WhatsApp Catalog Checkout is not included in your :plan plan. Please upgrade your plan to unlock in-chat checkout.",
            'MAX_META_AD_ACCOUNTS_LIMIT_REACHED' => "You have reached your connected Meta Ad Accounts limit (:limit accounts) for your :plan plan. Please upgrade to connect more ad accounts.",
            'MAX_META_CAMPAIGNS_LIMIT_REACHED' => "You have reached your active Meta Campaigns limit (:limit campaigns) for your :plan plan. Please upgrade to launch more campaigns.",
            'CLICK_TO_WHATSAPP_ADS_NOT_IN_PLAN' => "Click-to-WhatsApp Ads with automated flow triggers are not included in your :plan plan. Please upgrade your plan to unlock this feature.",
            'META_LEAD_SYNC_NOT_IN_PLAN' => "Automated Meta Lead Ads CRM synchronization is not included in your :plan plan. Please upgrade your plan to unlock lead sync.",
            'MONTHLY_MESSAGES_LIMIT_REACHED' => "You have reached your monthly message limit (:limit messages) for your :plan plan. Please upgrade your plan to send more messages.",
        ],
        'hi' => [
            'CHANNEL_NOT_ALLOWED_IN_PLAN' => "आपके वर्तमान सब्सक्रिप्शन प्लान (:plan) में :channel चैनल शामिल नहीं है। इस चैनल को अनलॉक करने के लिए कृपया अपने प्लान को अपग्रेड करें।",
            'CHANNEL_CAP_REACHED' => "आप अपने :plan प्लान पर अधिकतम अनुमत :channel कनेक्शन (:limit) तक पहुँच चुके हैं। और जोड़ने के लिए कृपया अपना प्लान अपग्रेड करें।",
            'MAX_CHANNELS_LIMIT_REACHED' => "आप अपने सब्सक्रिप्शन प्लान के लिए कुल चैनल सीमा (:limit चैनल) तक पहुँच चुके हैं। अधिक चैनल जोड़ने के लिए कृपया अपग्रेड करें।",
            'INTEGRATION_NOT_ALLOWED_IN_PLAN' => "आपके वर्तमान सब्सक्रिप्शन प्लान (:plan) में :integration एकीकरण शामिल नहीं है। इसे अनलॉक करने के लिए कृपया अपना प्लान अपग्रेड करें।",
            'MAX_INTEGRATIONS_LIMIT_REACHED' => "आप अपने सब्सक्रिप्शन प्लान के लिए कुल एकीकरण सीमा (:limit एकीकरण) तक पहुँच चुके हैं। अधिक एकीकरण जोड़ने के लिए कृपया अपग्रेड करें।",
            'TEMPLATES_NOT_INCLUDED_IN_PLAN' => "आपके वर्तमान सब्सक्रिप्शन प्लान (:plan) में फ्लो टेम्पलेट्स शामिल नहीं हैं। टेम्पलेट ब्लूप्रिंट का उपयोग करने के लिए कृपया अपग्रेड करें।",
            'MAX_CAMPAIGNS_LIMIT_REACHED' => "आप अपने सब्सक्रिप्शन प्लान के लिए कुल अभियान सीमा (:limit अभियान) तक पहुँच चुके हैं। और अभियान चलाने के लिए कृपया अपग्रेड करें।",
            'MAX_AUTOMATIONS_LIMIT_REACHED' => "आप अपने सब्सक्रिप्शन प्लान के लिए कुल ऑटोमेशन फ्लो सीमा (:limit ऑटोमेशन) तक पहुँच चुके हैं। अधिक फ्लो बनाने के लिए कृपया अपग्रेड करें।",
            'SEAT_LIMIT_REACHED' => "सीट सीमा समाप्त हो गई है। अधिक टीम सदस्यों को आमंत्रित करने के लिए अपना सब्सक्रिप्शन प्लान अपग्रेड करें।",
            'CRM_GATED' => "CRM कानबान डील्स पाइपलाइन प्रतिबंधित है। डील्स तक पहुँचने के लिए कृपया अपना सब्सक्रिप्शन टियर अपग्रेड करें।",
            'FLOW_CREDITS_EXHAUSTED' => "AI फ्लो निर्माण क्रेडिट समाप्त हो गए हैं। अधिक क्रेडिट प्राप्त करने के लिए अपना प्लान अपग्रेड करें।",
            'WORKSPACE_LIMIT_REACHED' => "आप अपने सब्सक्रिप्शन प्लान के लिए कुल वर्कस्पेस सीमा (:limit वर्कस्पेस) तक पहुँच चुके हैं। अधिक वर्कस्पेस बनाने के लिए कृपया अपग्रेड करें।",
            'TENANT_SUSPENDED' => "आपका वर्कस्पेस वर्तमान में निलंबित है। कृपया सहायता से संपर्क करें या बिलिंग का समाधान करें।",
            'MAX_ECOMMERCE_STORES_LIMIT_REACHED' => "आप अपने :plan प्लान के लिए कनेक्टेड ई-कॉमर्स स्टोर सीमा (:limit स्टोर) तक पहुँच चुके हैं। अधिक स्टोर जोड़ने के लिए अपग्रेड करें।",
            'MAX_ECOMMERCE_PRODUCTS_LIMIT_REACHED' => "आप अपने :plan प्लान के लिए उत्पाद कैटलॉग सीमा (:limit उत्पाद) तक पहुँच चुके हैं। अधिक उत्पाद सिंक करने के लिए अपग्रेड करें।",
            'MONTHLY_ECOMMERCE_ORDERS_LIMIT_REACHED' => "आप अपने :plan प्लान के लिए मासिक ऑर्डर प्रोसेसिंग सीमा (:limit ऑर्डर) तक पहुँच चुके हैं। अधिक ऑर्डर प्रोसेस करने के लिए अपग्रेड करें।",
            'ABANDONED_CART_RECOVERY_NOT_IN_PLAN' => "व्हाट्सएप अबैंडन्ड कार्ट रिकवरी आपके :plan प्लान में शामिल नहीं है। कृपया अपग्रेड करें।",
            'WHATSAPP_CHECKOUT_NOT_IN_PLAN' => "व्हाट्सएप कैटलॉग चेकआउट आपके :plan प्लान में शामिल नहीं है। इन-चैट चेकआउट अनलॉक करने के लिए अपग्रेड करें।",
            'MAX_META_AD_ACCOUNTS_LIMIT_REACHED' => "आप अपने :plan प्लान के लिए कनेक्टेड मेटा विज्ञापन खाते सीमा (:limit खाते) तक पहुँच चुके हैं। और विज्ञापन खाते जोड़ने के लिए कृपया अपना प्लान अपग्रेड करें।",
            'MAX_META_CAMPAIGNS_LIMIT_REACHED' => "आप अपने :plan प्लान के लिए सक्रिय मेटा अभियान सीमा (:limit अभियान) तक पहुँच चुके हैं। और अभियान चलाने के लिए कृपया अपना प्लान अपग्रेड करें।",
            'CLICK_TO_WHATSAPP_ADS_NOT_IN_PLAN' => "क्लिक-टू-WhatsApp विज्ञापन और फ्लो आपके :plan प्लान में शामिल नहीं हैं। कृपया अपना प्लान अपग्रेड करें।",
            'META_LEAD_SYNC_NOT_IN_PLAN' => "स्वचालित मेटा लीड सिंक आपके :plan प्लान में शामिल नहीं है। कृपया अपना प्लान अपग्रेड करें।",
            'MONTHLY_MESSAGES_LIMIT_REACHED' => "आप अपने :plan प्लान के लिए मासिक संदेश सीमा (:limit संदेश) तक पहुँच चुके हैं। और संदेश भेजने के लिए कृपया अपना प्लान अपग्रेड करें।",
        ],
        'es' => [
            'CHANNEL_NOT_ALLOWED_IN_PLAN' => "El canal :channel no está incluido en su plan de suscripción actual (:plan). Actualice su plan para desbloquear este canal.",
            'CHANNEL_CAP_REACHED' => "Ha alcanzado el límite máximo permitido de conexiones de :channel (:limit) en su plan :plan. Actualice su plan para agregar más.",
            'MAX_CHANNELS_LIMIT_REACHED' => "Ha alcanzado el límite total de canales (:limit canales) para su plan de suscripción. Actualice para conectar más canales.",
            'INTEGRATION_NOT_ALLOWED_IN_PLAN' => "La integración de :integration no está incluida en su plan de suscripción actual (:plan). Actualice su plan para desbloquearla.",
            'MAX_INTEGRATIONS_LIMIT_REACHED' => "Ha alcanzado el límite total de integraciones (:limit integraciones) para su plan de suscripción. Actualice para conectar más integraciones.",
            'TEMPLATES_NOT_INCLUDED_IN_PLAN' => "Las plantillas de flujo prediseñadas no están incluidas en su plan de suscripción actual (:plan). Actualice su plan para acceder a los esquemas de plantillas.",
            'MAX_CAMPAIGNS_LIMIT_REACHED' => "Ha alcanzado el límite total de campañas (:limit campañas) para su plan de suscripción. Actualice para lanzar más campañas.",
            'MAX_AUTOMATIONS_LIMIT_REACHED' => "Ha alcanzado el límite total de flujos de automatización (:limit automatizaciones) para su plan de suscripción. Actualice para crear más flujos.",
            'SEAT_LIMIT_REACHED' => "Límite de asientos alcanzado. Actualice su plan de suscripción para invitar a más miembros del equipo.",
            'CRM_GATED' => "El pipeline de acuerdos CRM Kanban está restringido. Actualice su nivel de suscripción para acceder a los acuerdos.",
            'FLOW_CREDITS_EXHAUSTED' => "Créditos de generación de flujos por IA agotados. Actualice su plan para recibir más créditos.",
            'WORKSPACE_LIMIT_REACHED' => "Ha alcanzado el límite total de espacios de trabajo (:limit espacios de trabajo) para su plan de suscripción. Actualice para crear más espacios de trabajo.",
            'TENANT_SUSPENDED' => "Su espacio de trabajo está actualmente suspendido. Comuníquese con soporte o resuelva la facturación.",
            'MAX_ECOMMERCE_STORES_LIMIT_REACHED' => "Ha alcanzado el límite de tiendas de comercio electrónico conectadas (:limit tiendas) para su plan :plan. Actualice para conectar más tiendas.",
            'MAX_ECOMMERCE_PRODUCTS_LIMIT_REACHED' => "Ha alcanzado el límite de catálogo de productos (:limit productos) para su plan :plan. Actualice para sincronizar más productos.",
            'MONTHLY_ECOMMERCE_ORDERS_LIMIT_REACHED' => "Ha alcanzado el límite mensual de procesamiento de pedidos (:limit pedidos) para su plan :plan. Actualice para procesar más pedidos.",
            'ABANDONED_CART_RECOVERY_NOT_IN_PLAN' => "La recuperación automatizada de carritos abandonados de WhatsApp no está incluida en su plan :plan. Actualice su plan.",
            'WHATSAPP_CHECKOUT_NOT_IN_PLAN' => "El pago directo por catálogo de WhatsApp no está incluido en su plan :plan. Actualice para desbloquear el pago en el chat.",
            'MAX_META_AD_ACCOUNTS_LIMIT_REACHED' => "Ha alcanzado el límite de cuentas publicitarias de Meta conectadas (:limit cuentas) para su plan :plan. Actualice su plan para conectar más cuentas.",
            'MAX_META_CAMPAIGNS_LIMIT_REACHED' => "Ha alcanzado el límite de campañas activas de Meta (:limit campañas) para su plan :plan. Actualice su plan para lanzar más campañas.",
            'CLICK_TO_WHATSAPP_ADS_NOT_IN_PLAN' => "Los anuncios de Click-to-WhatsApp con flujos automatizados no están incluidos en su plan :plan. Actualice su plan para desbloquear esta función.",
            'META_LEAD_SYNC_NOT_IN_PLAN' => "La sincronización automática de clientes potenciales de Meta no está incluida en su plan :plan. Actualice su plan para desbloquear la sincronización.",
            'MONTHLY_MESSAGES_LIMIT_REACHED' => "Ha alcanzado el límite mensual de mensajes (:limit mensajes) para su plan :plan. Actualice su plan para enviar más mensajes.",
        ],
        'ar' => [
            'CHANNEL_NOT_ALLOWED_IN_PLAN' => "قناة :channel غير مدرجة في خطة اشتراكك الحالية (:plan). يرجى ترقية خطتك لفتح هذه القناة.",
            'CHANNEL_CAP_REACHED' => "لقد بلغت الحد الأقصى المسموح به لاتصالات :channel (:limit) في خطتك :plan. يرجى ترقية خطتك لإضافة المزيد.",
            'MAX_CHANNELS_LIMIT_REACHED' => "لقد بلغت الحد الإجمالي للقنوات (:limit قنوات) لخطة اشتراكك. يرجى الترقية لربط المزيد من القنوات.",
            'INTEGRATION_NOT_ALLOWED_IN_PLAN' => "تكامل :integration غير مدرج في خطة اشتراكك الحالية (:plan). يرجى ترقية خطتك لفتح هذا التكامل.",
            'MAX_INTEGRATIONS_LIMIT_REACHED' => "لقد بلغت الحد الإجمالي للتكاملات (:limit تكاملات) لخطة اشتراكك. يرجى الترقية لربط المزيد من التكاملات.",
            'TEMPLATES_NOT_INCLUDED_IN_PLAN' => "قوالب المسارات الجاهزة غير مدرجة في خطة اشتراكك الحالية (:plan). يرجى ترقية خطتك للوصول إلى مكتبة القوالب.",
            'MAX_CAMPAIGNS_LIMIT_REACHED' => "لقد بلغت الحد الإجمالي للحملات (:limit حملات) لخطة اشتراكك. يرجى الترقية لإطلاق المزيد من الحملات.",
            'MAX_AUTOMATIONS_LIMIT_REACHED' => "لقد بلغت الحد الإجمالي لمسارات الأتمتة (:limit أتمتة) لخطة اشتراكك. يرجى الترقية لإنشاء المزيد من المسارات.",
            'SEAT_LIMIT_REACHED' => "تم الوصول إلى حد المقاعد. قم بترقية خطة اشتراكك لدعوة المزيد من أعضاء الفريق.",
            'CRM_GATED' => "مسار صفقات كانبان CRM مقيد. يرجى ترقية فئة اشتراكك للوصول إلى الصفقات.",
            'FLOW_CREDITS_EXHAUSTED' => "نفدت أرصدة توليد المسارات بالذكاء الاصطناعي. قم بترقية خطتك للحصول على المزيد من الأرصدة.",
            'WORKSPACE_LIMIT_REACHED' => "لقد بلغت الحد الإجمالي لمساحات العمل (:limit مساحات عمل) لخطة اشتراكك. يرجى الترقية لإنشاء المزيد من مساحات العمل.",
            'TENANT_SUSPENDED' => "مساحة العمل الخاصة بك معلقة حاليًا. يرجى الاتصال بالدعم أو تسوية الفواتير.",
            'MAX_ECOMMERCE_STORES_LIMIT_REACHED' => "لقد بلغت الحد الأقصى للمتاجر الإلكترونية المتصلة (:limit متاجر) لخطة :plan الخاصة بك. يرجى الترقية لإضافة المزيد من المتاجر.",
            'MAX_ECOMMERCE_PRODUCTS_LIMIT_REACHED' => "لقد بلغت الحد الأقصى لكتالوج المنتجات (:limit منتج) لخطة :plan الخاصة بك. يرجى الترقية لمزامنة المزيد من المنتجات.",
            'MONTHLY_ECOMMERCE_ORDERS_LIMIT_REACHED' => "لقد بلغت الحد الأقصى الشهري لمعالجة الطلبات (:limit طلب) لخطة :plan الخاصة بك. يرجى الترقية لمعالجة المزيد من الطلبات.",
            'ABANDONED_CART_RECOVERY_NOT_IN_PLAN' => "استرداد السلات المتروكة عبر واتساب غير مدرج في خطة :plan الخاصة بك. يرجى الترقية لفتح هذه الميزة.",
            'WHATSAPP_CHECKOUT_NOT_IN_PLAN' => "الدفع المباشر عبر كتالوج واتساب غير مدرج في خطة :plan الخاصة بك. يرجى الترقية لفتح الدفع داخل المحادثة.",
            'MAX_META_AD_ACCOUNTS_LIMIT_REACHED' => "لقد بلغت الحد الأقصى لحسابات إعلانات ميتا المتصلة (:limit حسابات) لخطة :plan الخاصة بك. يرجى الترقية لإضافة المزيد من الحسابات.",
            'MAX_META_CAMPAIGNS_LIMIT_REACHED' => "لقد بلغت الحد الأقصى لحملات ميتا النشطة (:limit حملات) لخطة :plan الخاصة بك. يرجى الترقية لإطلاق المزيد من الحملات.",
            'CLICK_TO_WHATSAPP_ADS_NOT_IN_PLAN' => "إعلانات التحويل إلى واتساب عبر مسارات الأتمتة غير مدرجة في خطة :plan الخاصة بك. يرجى الترقية لفتح هذه الميزة.",
            'META_LEAD_SYNC_NOT_IN_PLAN' => "المزامنة التلقائية لعملاء إعلانات ميتا المحتملين مع CRM غير مدرجة في خطة :plan الخاصة بك. يرجى الترقية لفتح المزامنة.",
            'MONTHLY_MESSAGES_LIMIT_REACHED' => "لقد بلغت الحد الأقصى الشهري للرسائل (:limit رسائل) لخطة :plan الخاصة بك. يرجى الترقية لإرسال المزيد من الرسائل.",
        ],
        'fr' => [
            'CHANNEL_NOT_ALLOWED_IN_PLAN' => "Le canal :channel n'est pas inclus dans votre forfait actuel (:plan). Veuillez mettre à niveau votre forfait pour débloquer ce canal.",
            'CHANNEL_CAP_REACHED' => "Vous avez atteint le nombre maximum de connexions :channel autorisées (:limit) sur votre forfait :plan. Mettez à niveau votre forfait pour en ajouter.",
            'MAX_CHANNELS_LIMIT_REACHED' => "Vous avez atteint votre limite totale de canaux (:limit canaux) pour votre forfait. Mettez à niveau pour connecter plus de canaux.",
            'INTEGRATION_NOT_ALLOWED_IN_PLAN' => "L'intégration :integration n'est pas incluse dans votre forfait actuel (:plan). Veuillez mettre à niveau votre forfait pour débloquer cette intégration.",
            'MAX_INTEGRATIONS_LIMIT_REACHED' => "Vous avez atteint votre limite totale d'intégrations (:limit intégrations) pour votre forfait. Mettez à niveau pour connecter plus d'intégrations.",
            'TEMPLATES_NOT_INCLUDED_IN_PLAN' => "Les modèles de flux prédéfinis ne sont pas inclus dans votre forfait actuel (:plan). Veuillez mettre à niveau votre forfait pour y accéder.",
            'MAX_CAMPAIGNS_LIMIT_REACHED' => "Vous avez atteint votre limite totale de campagnes (:limit campagnes) pour votre forfait. Mettez à niveau pour lancer plus de campagnes.",
            'MAX_AUTOMATIONS_LIMIT_REACHED' => "Vous avez atteint votre limite totale de flux d'automatisation (:limit automatisations) pour votre forfait. Mettez à niveau pour en créer davantage.",
            'SEAT_LIMIT_REACHED' => "Limite de sièges atteinte. Mettez à niveau votre forfait pour inviter plus de membres.",
            'CRM_GATED' => "Le pipeline des opportunités CRM Kanban est restreint. Veuillez mettre à niveau votre forfait pour y accéder.",
            'FLOW_CREDITS_EXHAUSTED' => "Crédits de génération IA épuisés. Mettez à niveau votre forfait pour recevoir plus de crédits.",
            'WORKSPACE_LIMIT_REACHED' => "Vous avez atteint votre limite totale d'espaces de travail (:limit espaces) pour votre forfait. Mettez à niveau pour créer plus d'espaces de travail.",
            'TENANT_SUSPENDED' => "Votre espace de travail est actuellement suspendu. Veuillez contacter l'assistance ou régler la facturation.",
            'MAX_ECOMMERCE_STORES_LIMIT_REACHED' => "Vous avez atteint votre limite de boutiques e-commerce connectées (:limit boutiques) pour votre forfait :plan. Mettez à niveau votre forfait.",
            'MAX_ECOMMERCE_PRODUCTS_LIMIT_REACHED' => "Vous avez atteint votre limite de catalogue de produits (:limit produits) pour votre forfait :plan. Mettez à niveau pour synchroniser plus de produits.",
            'MONTHLY_ECOMMERCE_ORDERS_LIMIT_REACHED' => "Vous avez atteint votre limite mensuelle de traitement des commandes (:limit commandes) pour votre forfait :plan. Mettez à niveau votre forfait.",
            'ABANDONED_CART_RECOVERY_NOT_IN_PLAN' => "La récupération automatisée des paniers abandonnés sur WhatsApp n'est pas incluse dans votre forfait :plan. Mettez à niveau votre forfait.",
            'WHATSAPP_CHECKOUT_NOT_IN_PLAN' => "Le paiement direct par catalogue WhatsApp n'est pas inclus dans votre forfait :plan. Mettez à niveau votre forfait.",
            'MAX_META_AD_ACCOUNTS_LIMIT_REACHED' => "Vous avez atteint votre limite de comptes publicitaires Meta connectés (:limit comptes) pour votre forfait :plan. Mettez à niveau votre forfait pour en connecter davantage.",
            'MAX_META_CAMPAIGNS_LIMIT_REACHED' => "Vous avez atteint votre limite de campagnes Meta actives (:limit campagnes) pour votre forfait :plan. Mettez à niveau pour lancer plus de campagnes.",
            'CLICK_TO_WHATSAPP_ADS_NOT_IN_PLAN' => "Les publicités Click-to-WhatsApp avec flux automatisés ne sont pas incluses dans votre forfait :plan. Mettez à niveau votre forfait pour débloquer cette fonctionnalité.",
            'META_LEAD_SYNC_NOT_IN_PLAN' => "La synchronisation automatisée des prospects Meta dans le CRM n'est pas incluse dans votre forfait :plan. Mettez à niveau votre forfait pour débloquer la synchronisation.",
            'MONTHLY_MESSAGES_LIMIT_REACHED' => "Vous avez atteint votre limite mensuelle de messages (:limit messages) pour votre forfait :plan. Veuillez mettre à niveau votre forfait pour envoyer plus de messages.",
        ],
        'he' => [
            'CHANNEL_NOT_ALLOWED_IN_PLAN' => "ערוץ :channel אינו כלול בתוכנית המנוי הנוכחית שלך (:plan). אנא שדרג את התוכנית שלך כדי לפתוח ערוץ זה.",
            'CHANNEL_CAP_REACHED' => "הגעת למספר המרבי של חיבורי :channel המותרים (:limit) בתוכנית :plan שלך. אנא שדרג את התוכנית כדי להוסיף עוד.",
            'MAX_CHANNELS_LIMIT_REACHED' => "הגעת למגבלת הערוצים הכוללת (:limit ערוצים) עבור תוכנית המנוי שלך. אנא שדרג כדי לחבר ערוצים נוספים.",
            'INTEGRATION_NOT_ALLOWED_IN_PLAN' => "אינטגרציית :integration אינה כלולה בתוכנית המנוי הנוכחית שלך (:plan). אנא שדרג את התוכנית שלך כדי לפתוח אינטגרציה זו.",
            'MAX_INTEGRATIONS_LIMIT_REACHED' => "הגעת למגבלת האינטגרציות הכוללת (:limit אינטגרציות) עבור תוכנית המנוי שלך. אנא שדרג כדי לחבר עוד אינטגרציות.",
            'TEMPLATES_NOT_INCLUDED_IN_PLAN' => "תבניות זרימה מובנות אינן כלולות בתוכנית המנוי הנוכחית שלך (:plan). אנא שדרג את התוכנית כדי לגשת לתבניות.",
            'MAX_CAMPAIGNS_LIMIT_REACHED' => "הגעת למגבלת הקמפיינים הכוללת (:limit קמפיינים) עבור תוכנית המנוי שלך. אנא שדרג כדי להשיק קמפיינים נוספים.",
            'MAX_AUTOMATIONS_LIMIT_REACHED' => "הגעת למגבלת זרימות האוטומציה הכוללת (:limit אוטומציות) עבור תוכנית המנוי שלך. אנא שדרג כדי ליצור זרימות נוספות.",
            'SEAT_LIMIT_REACHED' => "הגעת למגבלת המושבים. שדרג את תוכנית המנוי שלך כדי להזמין חברי צוות נוספים.",
            'CRM_GATED' => "צינור עסקאות ה-CRM של קנבן חסום. אנא שדרג את רמת המנוי שלך כדי לגשת לעסקאות.",
            'FLOW_CREDITS_EXHAUSTED' => "קרדיטי יצירת זרימות ה-AI אזלו. שדרג את התוכנית שלך כדי לקבל קרדיטים נוספים.",
            'WORKSPACE_LIMIT_REACHED' => "הגעת למגבלת סביבות העבודה הכוללת (:limit סביבות עבודה) עבור תוכנית המנוי שלך. אנא שדרג כדי ליצור סביבות עבודה נוספות.",
            'TENANT_SUSPENDED' => "סביבת העבודה שלך מושעית כעת. אנא צור קשר עם התמיכה או הסדר את החיוב.",
            'MAX_ECOMMERCE_STORES_LIMIT_REACHED' => "הגעת למגבלת חנויות המסחר האלקטרוני המחוברות (:limit חנויות) עבור תוכנית :plan שלך. אנא שדרג כדי לחבר חנויות נוספות.",
            'MAX_ECOMMERCE_PRODUCTS_LIMIT_REACHED' => "הגעת למגבלת קטלוג המוצרים (:limit מוצרים) עבור תוכנית :plan שלך. אנא שדרג כדי לסנכרן מוצרים נוספים.",
            'MONTHLY_ECOMMERCE_ORDERS_LIMIT_REACHED' => "הגעת למגבלת עיבוד ההזמנות החודשית (:limit הזמנות) עבור תוכנית :plan שלך. אנא שדרג כדי לעבד הזמנות נוספות.",
            'ABANDONED_CART_RECOVERY_NOT_IN_PLAN' => "שחזור עגלות נטושות אוטומטי בוואטסאפ אינו כלול בתוכנית :plan שלך. אנא שדרג כדי לפתוח תכונה זו.",
            'WHATSAPP_CHECKOUT_NOT_IN_PLAN' => "רכישה ישירה מקטלוג וואטסאפ אינה כלולה בתוכנית :plan שלך. אנא שדרג כדי לפתוח תכונה זו.",
            'MAX_META_AD_ACCOUNTS_LIMIT_REACHED' => "הגעת למגבלת חשבונות הפרסום של מטא המחוברים (:limit חשבונות) עבור תוכנית :plan שלך. אנא שדרג כדי לחבר חשבונות נוספים.",
            'MAX_META_CAMPAIGNS_LIMIT_REACHED' => "הגעת למגבלת קמפייני מטא הפעילים (:limit קמפיינים) עבור תוכנית :plan שלך. אנא שדרג כדי להשיק קמפיינים נוספים.",
            'CLICK_TO_WHATSAPP_ADS_NOT_IN_PLAN' => "מודעות קליק לוואטסאפ עם זרימות אוטומציה אינן כלולות בתוכנית :plan שלך. אנא שדרג כדי לפתוח תכונה זו.",
            'META_LEAD_SYNC_NOT_IN_PLAN' => "סנכרון לידים אוטומטי ממטא ל-CRM אינו כלול בתוכנית :plan שלך. אנא שדרג כדי לפתוח סנכרון לידים.",
            'MONTHLY_MESSAGES_LIMIT_REACHED' => "הגעת למגבלת ההודעות החודשית (:limit הודעות) עבור תוכנית :plan שלך. אנא שדרג את התוכנית שלך כדי לשלוח עוד הודעות.",
        ],
        'id' => [
            'CHANNEL_NOT_ALLOWED_IN_PLAN' => "Saluran :channel tidak termasuk dalam paket langganan Anda saat ini (:plan). Silakan tingkatkan paket Anda untuk membuka saluran ini.",
            'CHANNEL_CAP_REACHED' => "Anda telah mencapai batas maksimum koneksi :channel yang diizinkan (:limit) pada paket :plan Anda. Silakan tingkatkan paket untuk menambah lebih banyak.",
            'MAX_CHANNELS_LIMIT_REACHED' => "Anda telah mencapai total batas saluran (:limit saluran) untuk paket langganan Anda. Silakan tingkatkan untuk menghubungkan lebih banyak saluran.",
            'INTEGRATION_NOT_ALLOWED_IN_PLAN' => "Integrasi :integration tidak termasuk dalam paket langganan Anda saat ini (:plan). Silakan tingkatkan paket Anda untuk membuka integrasi ini.",
            'MAX_INTEGRATIONS_LIMIT_REACHED' => "Anda telah mencapai total batas integrasi (:limit integrasi) untuk paket langganan Anda. Silakan tingkatkan untuk menghubungkan lebih banyak integrasi.",
            'TEMPLATES_NOT_INCLUDED_IN_PLAN' => "Templat Alur siap pakai tidak termasuk dalam paket langganan Anda saat ini (:plan). Silakan tingkatkan paket Anda untuk mengakses cetak biru templat.",
            'MAX_CAMPAIGNS_LIMIT_REACHED' => "Anda telah mencapai total batas kampanye (:limit kampanye) untuk paket langganan Anda. Silakan tingkatkan untuk meluncurkan lebih banyak kampanye.",
            'MAX_AUTOMATIONS_LIMIT_REACHED' => "Anda telah mencapai total batas alur otomatisasi (:limit otomatisasi) untuk paket langganan Anda. Silakan tingkatkan untuk membuat lebih banyak alur.",
            'SEAT_LIMIT_REACHED' => "Batas kursi tercapai. Tingkatkan paket langganan Anda untuk mengundang lebih banyak anggota tim.",
            'CRM_GATED' => "Pipeline Penawaran CRM Kanban dibatasi. Silakan tingkatkan tingkat langganan Anda untuk mengakses penawaran.",
            'FLOW_CREDITS_EXHAUSTED' => "Kredit pembuatan alur AI telah habis. Tingkatkan paket Anda untuk menerima lebih banyak kredit.",
            'WORKSPACE_LIMIT_REACHED' => "Anda telah mencapai total batas ruang kerja (:limit ruang kerja) untuk paket langganan Anda. Silakan tingkatkan untuk membuat lebih banyak ruang kerja.",
            'TENANT_SUSPENDED' => "Ruang kerja Anda saat ini ditangguhkan. Silakan hubungi dukungan atau selesaikan tagihan.",
            'MAX_ECOMMERCE_STORES_LIMIT_REACHED' => "Anda telah mencapai batas toko e-commerce yang terhubung (:limit toko) untuk paket :plan Anda. Silakan tingkatkan untuk menghubungkan lebih banyak toko.",
            'MAX_ECOMMERCE_PRODUCTS_LIMIT_REACHED' => "Anda telah mencapai batas katalog produk (:limit produk) untuk paket :plan Anda. Silakan tingkatkan untuk menyinkronkan lebih banyak produk.",
            'MONTHLY_ECOMMERCE_ORDERS_LIMIT_REACHED' => "Anda telah mencapai batas pemrosesan pesanan bulanan (:limit pesanan) untuk paket :plan Anda. Silakan tingkatkan untuk memproses lebih banyak pesanan.",
            'ABANDONED_CART_RECOVERY_NOT_IN_PLAN' => "Pemulihan keranjang belanja terbengkalai WhatsApp otomatis tidak termasuk dalam paket :plan Anda. Silakan tingkatkan paket Anda.",
            'WHATSAPP_CHECKOUT_NOT_IN_PLAN' => "Checkout katalog WhatsApp langsung tidak termasuk dalam paket :plan Anda. Silakan tingkatkan paket Anda.",
            'MAX_META_AD_ACCOUNTS_LIMIT_REACHED' => "Anda telah mencapai batas akun iklan Meta yang terhubung (:limit akun) untuk paket :plan Anda. Silakan tingkatkan untuk menghubungkan lebih banyak akun.",
            'MAX_META_CAMPAIGNS_LIMIT_REACHED' => "Anda telah mencapai batas kampanye Meta aktif (:limit kampanye) untuk paket :plan Anda. Silakan tingkatkan untuk meluncurkan lebih banyak kampanye.",
            'CLICK_TO_WHATSAPP_ADS_NOT_IN_PLAN' => "Iklan Klik-ke-WhatsApp dengan alur otomatis tidak termasuk dalam paket :plan Anda. Silakan tingkatkan paket Anda untuk membuka fitur ini.",
            'META_LEAD_SYNC_NOT_IN_PLAN' => "Sinkronisasi otomatis prospek Meta ke CRM tidak termasuk dalam paket :plan Anda. Silakan tingkatkan paket Anda untuk membuka sinkronisasi.",
            'MONTHLY_MESSAGES_LIMIT_REACHED' => "Anda telah mencapai batas pengiriman pesan bulanan (:limit pesan) untuk paket :plan Anda. Silakan tingkatkan paket Anda untuk mengirim lebih banyak pesan.",
        ],
        'it' => [
            'CHANNEL_NOT_ALLOWED_IN_PLAN' => "Il canale :channel non è incluso nel tuo piano di abbonamento attuale (:plan). Effettua l'upgrade del piano per sbloccare questo canale.",
            'CHANNEL_CAP_REACHED' => "Hai raggiunto il numero massimo di connessioni :channel consentite (:limit) sul tuo piano :plan. Effettua l'upgrade per aggiungerne altre.",
            'MAX_CHANNELS_LIMIT_REACHED' => "Hai raggiunto il limite totale di canali (:limit canali) per il tuo piano di abbonamento. Effettua l'upgrade per connettere più canali.",
            'INTEGRATION_NOT_ALLOWED_IN_PLAN' => "L'integrazione :integration non è inclusa nel tuo piano di abbonamento attuale (:plan). Effettua l'upgrade del piano per sbloccarla.",
            'MAX_INTEGRATIONS_LIMIT_REACHED' => "Hai raggiunto il limite totale di integrazioni (:limit integrazioni) per il tuo piano di abbonamento. Effettua l'upgrade per connettere più integrazioni.",
            'TEMPLATES_NOT_INCLUDED_IN_PLAN' => "I modelli di flusso predefiniti non sono inclusi nel tuo piano di abbonamento attuale (:plan). Effettua l'upgrade per accedere ai modelli.",
            'MAX_CAMPAIGNS_LIMIT_REACHED' => "Hai raggiunto il limite totale di campagne (:limit campagne) per il tuo piano di abbonamento. Effettua l'upgrade per lanciare altre campagne.",
            'MAX_AUTOMATIONS_LIMIT_REACHED' => "Hai raggiunto il limite totale di flussi di automazione (:limit automazioni) per il tuo piano. Effettua l'upgrade per creare più flussi.",
            'SEAT_LIMIT_REACHED' => "Limite di postazioni raggiunto. Effettua l'upgrade del tuo piano per invitare altri membri del team.",
            'CRM_GATED' => "La pipeline delle trattative CRM Kanban è riservata. Effettua l'upgrade del livello di abbonamento per accedere alle trattative.",
            'FLOW_CREDITS_EXHAUSTED' => "Crediti di generazione flussi AI esauriti. Effettua l'upgrade del piano per ricevere altri crediti.",
            'WORKSPACE_LIMIT_REACHED' => "Hai raggiunto il limite totale di aree di lavoro (:limit aree di lavoro) per il tuo piano di abbonamento. Effettua l'upgrade per creare altre aree di lavoro.",
            'TENANT_SUSPENDED' => "Il tuo spazio di lavoro è attualmente sospeso. Contatta l'assistenza o verifica i pagamenti.",
            'MAX_ECOMMERCE_STORES_LIMIT_REACHED' => "Hai raggiunto il limite di negozi e-commerce connessi (:limit negozi) per il tuo piano :plan. Effettua l'upgrade per connettere altri negozi.",
            'MAX_ECOMMERCE_PRODUCTS_LIMIT_REACHED' => "Hai raggiunto il limite del catalogo prodotti (:limit prodotti) per il tuo piano :plan. Effettua l'upgrade per sincronizzare altri prodotti.",
            'MONTHLY_ECOMMERCE_ORDERS_LIMIT_REACHED' => "Hai raggiunto il limite mensile di elaborazione ordini (:limit ordini) per il tuo piano :plan. Effettua l'upgrade per elaborare altri ordini.",
            'ABANDONED_CART_RECOVERY_NOT_IN_PLAN' => "Il recupero automatico dei carrelli abbandonati su WhatsApp non è incluso nel tuo piano :plan. Effettua l'upgrade.",
            'WHATSAPP_CHECKOUT_NOT_IN_PLAN' => "Il checkout diretto da catalogo WhatsApp non è incluso nel tuo piano :plan. Effettua l'upgrade.",
            'MAX_META_AD_ACCOUNTS_LIMIT_REACHED' => "Hai raggiunto il limite di account pubblicitari Meta connessi (:limit account) per il tuo piano :plan. Effettua l'upgrade per connettere altri account.",
            'MAX_META_CAMPAIGNS_LIMIT_REACHED' => "Hai raggiunto il limite di campagne Meta attive (:limit campagne) per il tuo piano :plan. Effettua l'upgrade per lanciare altre campagne.",
            'CLICK_TO_WHATSAPP_ADS_NOT_IN_PLAN' => "Le inserzioni Click-to-WhatsApp con flussi automatizzati non sono incluse nel tuo piano :plan. Effettua l'upgrade per sbloccare questa funzionalità.",
            'META_LEAD_SYNC_NOT_IN_PLAN' => "La sincronizzazione automatica dei lead di Meta con il CRM non è inclusa nel tuo piano :plan. Effettua l'upgrade per sbloccarla.",
            'MONTHLY_MESSAGES_LIMIT_REACHED' => "Hai raggiunto il limite mensile di messaggi (:limit messaggi) per il tuo piano :plan. Effettua l'upgrade per inviare altri messaggi.",
        ],
        'pt' => [
            'CHANNEL_NOT_ALLOWED_IN_PLAN' => "O canal :channel não está incluído no seu plano de assinatura atual (:plan). Atualize seu plano para desbloquear este canal.",
            'CHANNEL_CAP_REACHED' => "Você atingiu o número máximo de conexões de :channel permitidas (:limit) no seu plano :plan. Atualize seu plano para adicionar mais.",
            'MAX_CHANNELS_LIMIT_REACHED' => "Você atingiu o limite total de canais (:limit canais) para o seu plano de assinatura. Atualize para conectar mais canais.",
            'INTEGRATION_NOT_ALLOWED_IN_PLAN' => "A integração :integration não está incluída no seu plano de assinatura atual (:plan). Atualize seu plano para desbloquear esta integração.",
            'MAX_INTEGRATIONS_LIMIT_REACHED' => "Você atingiu o limite total de integrações (:limit integrações) para o seu plano de assinatura. Atualize para conectar mais integrações.",
            'TEMPLATES_NOT_INCLUDED_IN_PLAN' => "Os modelos de fluxo pré-criados não estão incluídos no seu plano de assinatura atual (:plan). Atualize seu plano para acessar os modelos.",
            'MAX_CAMPAIGNS_LIMIT_REACHED' => "Você atingiu o limite total de campanhas (:limit campanhas) para o seu plano de assinatura. Atualize para lançar mais campanhas.",
            'MAX_AUTOMATIONS_LIMIT_REACHED' => "Você atingiu o limite total de fluxos de automação (:limit automações) para o seu plano. Atualize para criar mais fluxos.",
            'SEAT_LIMIT_REACHED' => "Limite de assentos atingido. Atualize seu plano de assinatura para convidar mais membros da equipe.",
            'CRM_GATED' => "O pipeline de negócios CRM Kanban é restrito. Atualize seu nível de assinatura para acessar os negócios.",
            'FLOW_CREDITS_EXHAUSTED' => "Créditos de geração de fluxos por IA esgotados. Atualize seu plano para receber mais créditos.",
            'WORKSPACE_LIMIT_REACHED' => "Você atingiu o limite total de espaços de trabalho (:limit espaços de trabalho) para o seu plano de assinatura. Atualize para criar mais espaços de trabalho.",
            'TENANT_SUSPENDED' => "Seu espaço de trabalho está suspenso no momento. Entre em contato com o suporte ou regularize o faturamento.",
            'MAX_ECOMMERCE_STORES_LIMIT_REACHED' => "Você atingiu o limite de lojas de e-commerce conectadas (:limit lojas) para o seu plano :plan. Atualize seu plano para conectar mais lojas.",
            'MAX_ECOMMERCE_PRODUCTS_LIMIT_REACHED' => "Você atingiu o limite de catálogo de produtos (:limit produtos) para o seu plano :plan. Atualize para sincronizar mais produtos.",
            'MONTHLY_ECOMMERCE_ORDERS_LIMIT_REACHED' => "Você atingiu o limite mensal de processamento de pedidos (:limit pedidos) para o seu plano :plan. Atualize para processar mais pedidos.",
            'ABANDONED_CART_RECOVERY_NOT_IN_PLAN' => "A recuperação automática de carrinhos abandonados via WhatsApp não está incluída no seu plano :plan. Atualize seu plano.",
            'WHATSAPP_CHECKOUT_NOT_IN_PLAN' => "O checkout direto do catálogo do WhatsApp não está incluído no seu plano :plan. Atualize para desbloquear.",
            'MAX_META_AD_ACCOUNTS_LIMIT_REACHED' => "Você atingiu o limite de contas de anúncios da Meta conectadas (:limit contas) para o seu plano :plan. Atualize seu plano para conectar mais contas.",
            'MAX_META_CAMPAIGNS_LIMIT_REACHED' => "Você atingiu o limite de campanhas ativas da Meta (:limit campanhas) para o seu plano :plan. Atualize seu plano para lançar mais campanhas.",
            'CLICK_TO_WHATSAPP_ADS_NOT_IN_PLAN' => "Anúncios Clique para o WhatsApp com fluxos automatizados não estão incluídos no seu plano :plan. Atualize seu plano para desbloquear este recurso.",
            'META_LEAD_SYNC_NOT_IN_PLAN' => "A sincronização automática de leads da Meta com o CRM não está incluída no seu plano :plan. Atualize seu plano para desbloquear a sincronização.",
            'MONTHLY_MESSAGES_LIMIT_REACHED' => "Você atingiu o limite mensal de mensagens (:limit mensagens) para o seu plano :plan. Atualize seu plano para enviar mais mensagens.",
        ],
        'vi' => [
            'CHANNEL_NOT_ALLOWED_IN_PLAN' => "Kênh :channel không có trong gói đăng ký hiện tại của bạn (:plan). Vui lòng nâng cấp gói để mở khóa kênh này.",
            'CHANNEL_CAP_REACHED' => "Bạn đã đạt số lượng kết nối :channel tối đa cho phép (:limit) trên gói :plan. Vui lòng nâng cấp gói để kết nối thêm.",
            'MAX_CHANNELS_LIMIT_REACHED' => "Bạn đã đạt tổng giới hạn kênh (:limit kênh) cho gói đăng ký của mình. Vui lòng nâng cấp để kết nối thêm nhiều kênh.",
            'INTEGRATION_NOT_ALLOWED_IN_PLAN' => "Tích hợp :integration không có trong gói đăng ký hiện tại của bạn (:plan). Vui lòng nâng cấp gói để mở khóa tích hợp này.",
            'MAX_INTEGRATIONS_LIMIT_REACHED' => "Bạn đã đạt tổng giới hạn tích hợp (:limit tích hợp) cho gói đăng ký của mình. Vui lòng nâng cấp để kết nối thêm nhiều tích hợp.",
            'TEMPLATES_NOT_INCLUDED_IN_PLAN' => "Mẫu luồng thiết kế sẵn không có trong gói đăng ký hiện tại của bạn (:plan). Vui lòng nâng cấp gói để sử dụng các mẫu luồng.",
            'MAX_CAMPAIGNS_LIMIT_REACHED' => "Bạn đã đạt tổng giới hạn chiến dịch (:limit chiến dịch) cho gói đăng ký của mình. Vui lòng nâng cấp để tạo thêm chiến dịch.",
            'MAX_AUTOMATIONS_LIMIT_REACHED' => "Bạn đã đạt tổng giới hạn luồng tự động hóa (:limit luồng) cho gói đăng ký của mình. Vui lòng nâng cấp để tạo thêm luồng mới.",
            'SEAT_LIMIT_REACHED' => "Đã đạt giới hạn số lượng thành viên. Hãy nâng cấp gói đăng ký để mời thêm thành viên vào nhóm.",
            'CRM_GATED' => "Quy trình quản lý cơ hội CRM Kanban đang bị giới hạn. Vui lòng nâng cấp gói để truy cập các cơ hội bán hàng.",
            'FLOW_CREDITS_EXHAUSTED' => "Đã hết lượt tạo luồng bằng AI. Hãy nâng cấp gói để nhận thêm lượt tạo luồng.",
            'WORKSPACE_LIMIT_REACHED' => "Bạn đã đạt tổng giới hạn không gian làm việc (:limit không gian làm việc) cho gói đăng ký của mình. Vui lòng nâng cấp để tạo thêm không gian làm việc.",
            'TENANT_SUSPENDED' => "Không gian làm việc của bạn hiện đang bị tạm khóa. Vui lòng liên hệ hỗ trợ hoặc hoàn tất thanh toán.",
            'MAX_ECOMMERCE_STORES_LIMIT_REACHED' => "Bạn đã đạt giới hạn cửa hàng thương mại điện tử kết nối (:limit cửa hàng) cho gói :plan của mình. Vui lòng nâng cấp để kết nối thêm.",
            'MAX_ECOMMERCE_PRODUCTS_LIMIT_REACHED' => "Bạn đã đạt giới hạn danh mục sản phẩm (:limit sản phẩm) cho gói :plan của mình. Vui lòng nâng cấp để đồng bộ thêm sản phẩm.",
            'MONTHLY_ECOMMERCE_ORDERS_LIMIT_REACHED' => "Bạn đã đạt giới hạn xử lý đơn hàng hàng tháng (:limit đơn hàng) cho gói :plan của mình. Vui lòng nâng cấp để xử lý thêm đơn hàng.",
            'ABANDONED_CART_RECOVERY_NOT_IN_PLAN' => "Tính năng tự động khôi phục giỏ hàng bị bỏ quên qua WhatsApp không có trong gói :plan. Vui lòng nâng cấp gói.",
            'WHATSAPP_CHECKOUT_NOT_IN_PLAN' => "Tính năng thanh toán trực tiếp qua danh mục WhatsApp không có trong gói :plan. Vui lòng nâng cấp để mở khóa.",
            'MAX_META_AD_ACCOUNTS_LIMIT_REACHED' => "Bạn đã đạt giới hạn tài khoản quảng cáo Meta kết nối (:limit tài khoản) cho gói :plan của mình. Vui lòng nâng cấp để kết nối thêm tài khoản.",
            'MAX_META_CAMPAIGNS_LIMIT_REACHED' => "Bạn đã đạt giới hạn chiến dịch Meta đang hoạt động (:limit chiến dịch) cho gói :plan của mình. Vui lòng nâng cấp để tạo thêm chiến dịch.",
            'CLICK_TO_WHATSAPP_ADS_NOT_IN_PLAN' => "Quảng cáo Nhấp để nhắn tin WhatsApp kèm luồng tự động hóa không có trong gói :plan. Vui lòng nâng cấp để mở khóa tính năng này.",
            'META_LEAD_SYNC_NOT_IN_PLAN' => "Tự động đồng bộ khách hàng tiềm năng từ Meta vào CRM không có trong gói :plan. Vui lòng nâng cấp để mở khóa tính năng này.",
            'MONTHLY_MESSAGES_LIMIT_REACHED' => "Bạn đã đạt giới hạn tin nhắn hàng tháng (:limit tin nhắn) cho gói :plan của mình. Vui lòng nâng cấp gói để gửi thêm tin nhắn.",
        ],
    ];

    /**
     * Resolve the current preferred user/request locale.
     */
    public static function resolveLocale(): string
    {
        $lang = request()?->header('Accept-Language');
        if ($lang) {
            $code = strtolower(substr($lang, 0, 2));
            if (array_key_exists($code, self::MESSAGES)) {
                return $code;
            }
        }
        $user = auth()->user();
        if ($user && !empty($user->language)) {
            $code = strtolower(substr($user->language, 0, 2));
            if (array_key_exists($code, self::MESSAGES)) {
                return $code;
            }
        }
        return 'en';
    }

    /**
     * Get a localized message string with variable replacements.
     */
    public static function trans(string $code, array $replace = []): string
    {
        $locale = self::resolveLocale();
        $template = self::MESSAGES[$locale][$code] ?? self::MESSAGES['en'][$code] ?? $code;
        foreach ($replace as $key => $value) {
            $template = str_replace(':' . $key, (string) $value, $template);
        }
        return $template;
    }

    /**
     * Check if a tenant has access to a specific feature and check if they've exceeded their limits.
     *
     * @param Tenant $tenant
     * @param string $feature The feature to check (team_members, campaigns, integrations, crm_access, channels, automations)
     * @param int $currentCount The current count of resource records
     * @return bool True if allowed, false if limit exceeded or feature disabled.
     */
    public function canUseFeature(Tenant $tenant, string $feature, int $currentCount = 0): bool
    {
        // If tenant is suspended, deny all access
        if ($tenant->status === 'suspended') {
            return false;
        }

        $plan = $tenant->plan;
        
        // If no plan, check if they are in trial status and define default trial limits
        if (!$plan) {
            if ($tenant->status === 'trial') {
                $trialLimits = [
                    'team_members' => 3,
                    'campaigns' => 2,
                    'integrations' => 1,
                    'crm_access' => false,
                    'channels' => 2,
                    'automations' => 2,
                    'flow_credits' => 5,
                    'copilot_credits' => 20,
                    'ecommerce_stores' => 1,
                    'ecommerce_products' => 50,
                    'monthly_ecommerce_orders' => 50,
                    'abandoned_cart_recovery' => false,
                    'whatsapp_checkout' => false,
                ];

                if ($feature === 'crm_access') {
                    return $trialLimits['crm_access'];
                }
                if ($feature === 'abandoned_cart_recovery') {
                    return $trialLimits['abandoned_cart_recovery'];
                }
                if ($feature === 'whatsapp_checkout') {
                    return $trialLimits['whatsapp_checkout'];
                }

                return isset($trialLimits[$feature]) && $currentCount < $trialLimits[$feature];
            }
            
            return false;
        }

        switch ($feature) {
            case 'team_members':
                $limit = $plan->max_team_members ?? 5;
                return $limit === -1 || $currentCount < $limit;

            case 'campaigns':
                $limit = $plan->max_campaigns ?? 10;
                return $limit === -1 || $currentCount < $limit;

            case 'integrations':
                $limit = $plan->max_integrations ?? 5;
                return $limit === -1 || $currentCount < $limit;

            case 'crm_access':
                return (bool) $plan->own_crm_access;

            case 'channels':
                $limit = $plan->max_channels ?? 2;
                return $limit === -1 || $currentCount < $limit;

            case 'automations':
                $limit = $plan->max_automations ?? 5;
                return $limit === -1 || $currentCount < $limit;

            case 'ecommerce_stores':
                $limit = $plan->max_ecommerce_stores ?? 1;
                return $limit === -1 || $currentCount < $limit;

            case 'ecommerce_products':
                $limit = $plan->max_ecommerce_products ?? 100;
                return $limit === -1 || $currentCount < $limit;

            case 'monthly_ecommerce_orders':
                $limit = $plan->monthly_ecommerce_orders ?? 100;
                return $limit === -1 || $currentCount < $limit;

            case 'abandoned_cart_recovery':
                return (bool) ($plan->has_abandoned_cart_recovery ?? false);

            case 'whatsapp_checkout':
                return (bool) ($plan->has_whatsapp_checkout ?? false);

            case 'flow_credits':
                $limit = $plan->flow_credits ?? 50;
                return $limit === -1 || $currentCount < $limit;

            case 'copilot_credits':
                $copilotLimit = $tenant->getCopilotCreditsLimit();
                if ($copilotLimit === -1) {
                    return true;
                }
                return $currentCount < $copilotLimit;

            case 'workspaces':
                $limit = $plan->max_workspaces ?? 1;
                return $limit === -1 || $currentCount < $limit;

            case 'monthly_ai_tokens':
                $limit = $plan->monthly_ai_tokens ?? 100000;
                return $limit === -1 || $currentCount < $limit;

            case 'meta_ad_accounts':
                $limit = $tenant->getMetaAdAccountsLimit();
                return $limit === -1 || $currentCount < $limit;

            case 'meta_campaigns':
                $limit = $tenant->getMetaCampaignsLimit();
                return $limit === -1 || $currentCount < $limit;

            case 'monthly_messages':
                $limit = $tenant->getMonthlyMessagesLimit();
                return $limit === -1 || $currentCount < $limit;

            default:
                return false;
        }
    }

    /**
     * Check if tenant can connect a new channel with granular per-channel cap and overall limit.
     *
     * @param Tenant $tenant
     * @param string $channelType (whatsapp, whatsapp_baileys, telegram, instagram, messenger, sms, email, live_chat, tiktok, linkedin)
     * @param int $additional Number of channels trying to connect (default 1)
     * @return array ['allowed' => bool, 'reason' => string|null, 'code' => string|null]
     */
    public function canConnectChannel(Tenant $tenant, string $channelType, int $additional = 1): array
    {
        if ($tenant->status === 'suspended') {
            return [
                'allowed' => false,
                'reason' => self::trans('TENANT_SUSPENDED'),
                'code' => 'TENANT_SUSPENDED'
            ];
        }

        $plan = $tenant->plan;
        $channelLabel = self::CHANNEL_LABELS[$channelType] ?? ucfirst(str_replace('_', ' ', $channelType));

        // 1. Granular Allowed Channels & Per-Channel Cap Check (High priority for specific error code)
        $channelCap = null;
        if ($plan && !empty($plan->allowed_channels) && is_array($plan->allowed_channels)) {
            $allowedChannels = $plan->allowed_channels;

            // Resolve alias key for WhatsApp Cloud vs WhatsApp Baileys vs WhatsApp
            $capKey = $channelType;
            if (!array_key_exists($capKey, $allowedChannels) && !in_array($capKey, $allowedChannels, true)) {
                if (($channelType === 'whatsapp_cloud' || $channelType === 'whatsapp_baileys') && (array_key_exists('whatsapp', $allowedChannels) || in_array('whatsapp', $allowedChannels, true))) {
                    $capKey = 'whatsapp';
                } elseif ($channelType === 'whatsapp' && (array_key_exists('whatsapp_cloud', $allowedChannels) || in_array('whatsapp_cloud', $allowedChannels, true))) {
                    $capKey = 'whatsapp_cloud';
                }
            }

            $isIndexedList = array_is_list($allowedChannels);

            if ($isIndexedList) {
                $isAllowed = in_array($channelType, $allowedChannels, true) || in_array($capKey, $allowedChannels, true);
                if (!$isAllowed) {
                    return [
                        'allowed' => false,
                        'reason' => self::trans('CHANNEL_NOT_ALLOWED_IN_PLAN', [
                            'channel' => $channelLabel,
                            'plan' => $plan->name
                        ]),
                        'code' => 'CHANNEL_NOT_ALLOWED_IN_PLAN'
                    ];
                }
                $channelCap = null; // Uncapped within overall limit
            } else {
                // Associative map
                if (!array_key_exists($capKey, $allowedChannels) && !array_key_exists($channelType, $allowedChannels)) {
                    return [
                        'allowed' => false,
                        'reason' => self::trans('CHANNEL_NOT_ALLOWED_IN_PLAN', [
                            'channel' => $channelLabel,
                            'plan' => $plan->name
                        ]),
                        'code' => 'CHANNEL_NOT_ALLOWED_IN_PLAN'
                    ];
                }

                $configuredVal = array_key_exists($channelType, $allowedChannels) ? $allowedChannels[$channelType] : $allowedChannels[$capKey];

                if ($configuredVal === false || $configuredVal === 0 || $configuredVal === '0') {
                    return [
                        'allowed' => false,
                        'reason' => self::trans('CHANNEL_NOT_ALLOWED_IN_PLAN', [
                            'channel' => $channelLabel,
                            'plan' => $plan->name
                        ]),
                        'code' => 'CHANNEL_NOT_ALLOWED_IN_PLAN'
                    ];
                }

                // If numeric: -1 is explicitly unlimited; positive integer is the cap
                if (is_numeric($configuredVal)) {
                    $channelCap = (int) $configuredVal;
                }
            }

            // If a specific numeric cap is defined and NOT -1 (unlimited)
            if ($channelCap !== null && $channelCap !== -1) {
                $currentChannelCount = ChannelConnection::where('tenant_id', $tenant->id)
                    ->where(function ($q) use ($channelType) {
                        $q->where('channel_type', $channelType);
                        if ($channelType === 'whatsapp') {
                            $q->orWhere('channel_type', 'whatsapp_cloud');
                        } elseif ($channelType === 'whatsapp_cloud') {
                            $q->orWhere('channel_type', 'whatsapp');
                        }
                    })
                    ->count();

                if (($currentChannelCount + $additional) > $channelCap) {
                    return [
                        'allowed' => false,
                        'reason' => self::trans('CHANNEL_CAP_REACHED', [
                            'channel' => $channelLabel,
                            'limit' => $channelCap,
                            'plan' => $plan->name
                        ]),
                        'code' => 'CHANNEL_CAP_REACHED',
                        'limit' => $channelCap,
                        'current' => $currentChannelCount
                    ];
                }
            }
        }

        // 2. Overall Channel Connections Count Check (-1 = unlimited)
        $maxTotalChannels = $plan ? (int) $plan->max_channels : ($tenant->status === 'trial' ? 2 : 0);

        if ($maxTotalChannels !== -1) {
            $totalChannelsCount = ChannelConnection::where('tenant_id', $tenant->id)->count();

            // Effective total limit must never be lower than the allowed per-channel cap
            if ($plan && is_array($plan->allowed_channels)) {
                $numericCaps = array_filter($plan->allowed_channels, fn($v) => is_numeric($v) && $v > 0);
                if (!empty($numericCaps)) {
                    $maxTotalChannels = max($maxTotalChannels, (int)($channelCap ?? 0), max($numericCaps));
                }
            }

            if (($totalChannelsCount + $additional) > $maxTotalChannels) {
                return [
                    'allowed' => false,
                    'reason' => self::trans('MAX_CHANNELS_LIMIT_REACHED', [
                        'limit' => $maxTotalChannels
                    ]),
                    'code' => 'MAX_CHANNELS_LIMIT_REACHED',
                    'limit' => $maxTotalChannels,
                    'current' => $totalChannelsCount
                ];
            }
        }

        return ['allowed' => true, 'reason' => null, 'code' => null];
    }

    /**
     * Check if tenant can use or connect a specific individual integration.
     *
     * @param Tenant $tenant
     * @param string $integrationKey (google_sheets, shopify, woocommerce, zoom, teams, hubspot, salesforce, zoho, zapier, n8n)
     * @return array ['allowed' => bool, 'reason' => string|null, 'code' => string|null]
     */
    public function canUseIntegration(Tenant $tenant, string $integrationKey): array
    {
        if ($tenant->status === 'suspended') {
            return [
                'allowed' => false,
                'reason' => self::trans('TENANT_SUSPENDED'),
                'code' => 'TENANT_SUSPENDED'
            ];
        }

        $plan = $tenant->plan;
        $integrationLabel = self::INTEGRATION_LABELS[$integrationKey] ?? ucfirst(str_replace('_', ' ', $integrationKey));

        // If plan specifies allowed integrations array (even if empty [])
        if ($plan && is_array($plan->allowed_integrations)) {
            $allowed = $plan->allowed_integrations;
            $groupKey = self::INTEGRATION_GROUPS[$integrationKey] ?? null;

            if ($integrationKey === 'google_calendar') {
                $isAllowed = in_array('google_calendar', $allowed, true)
                    || in_array('google_sheets', $allowed, true)
                    || in_array('google', $allowed, true)
                    || in_array('meetings', $allowed, true)
                    || in_array('calendar', $allowed, true);
            } elseif ($integrationKey === 'google_sheets') {
                $isAllowed = in_array('google_sheets', $allowed, true)
                    || in_array('google', $allowed, true);
            } else {
                $isAllowed = in_array($integrationKey, $allowed, true)
                    || ($groupKey && in_array($groupKey, $allowed, true));
            }

            if (!$isAllowed) {
                return [
                    'allowed' => false,
                    'reason' => self::trans('INTEGRATION_NOT_ALLOWED_IN_PLAN', [
                        'integration' => $integrationLabel,
                        'plan' => $plan->name
                    ]),
                    'code' => 'INTEGRATION_NOT_ALLOWED_IN_PLAN'
                ];
            }
        }

        return ['allowed' => true, 'reason' => null, 'code' => null];
    }

    /**
     * Check if tenant is permitted to browse and instantiate pre-built Flow Templates.
     *
     * @param Tenant $tenant
     * @return array ['allowed' => bool, 'reason' => string|null, 'code' => string|null]
     */
    public function canAccessFlowTemplates(Tenant $tenant): array
    {
        if ($tenant->status === 'suspended') {
            return [
                'allowed' => false,
                'reason' => self::trans('TENANT_SUSPENDED'),
                'code' => 'TENANT_SUSPENDED'
            ];
        }

        $plan = $tenant->plan;

        if ($plan && $plan->has_flow_templates === false) {
            return [
                'allowed' => false,
                'reason' => self::trans('TEMPLATES_NOT_INCLUDED_IN_PLAN', [
                    'plan' => $plan->name
                ]),
                'code' => 'TEMPLATES_NOT_INCLUDED_IN_PLAN'
            ];
        }

        return ['allowed' => true, 'reason' => null, 'code' => null];
    }

    /**
     * Check if user can create a new workspace account under their subscription plan limit.
     *
     * @param \App\Models\User $user
     * @return array ['allowed' => bool, 'reason' => string|null, 'code' => string|null, 'limit' => int, 'current' => int]
     */
    public function canCreateWorkspace(\App\Models\User $user): array
    {
        if (!$user->isOwner()) {
            return [
                'allowed' => false,
                'reason' => 'Only the workspace account owner can create additional workspaces.',
                'code' => 'NOT_OWNER',
                'limit' => 0,
                'current' => 0,
            ];
        }

        // Resolve plan from primary tenant or active tenant
        $primaryTenant = $user->tenant;
        $plan = $primaryTenant?->plan;

        $maxWorkspaces = $plan ? ($plan->max_workspaces ?? 1) : 1;
        $currentWorkspacesCount = \App\Models\Tenant::where('owner_id', $user->id)->count();

        // If for any reason count is 0 but user has primary tenant, count is at least 1
        if ($currentWorkspacesCount === 0 && $primaryTenant) {
            $currentWorkspacesCount = 1;
        }

        if ($maxWorkspaces === -1) {
            return [
                'allowed' => true,
                'reason' => null,
                'code' => null,
                'limit' => -1,
                'current' => $currentWorkspacesCount,
            ];
        }

        if ($currentWorkspacesCount >= $maxWorkspaces) {
            return [
                'allowed' => false,
                'reason' => self::trans('WORKSPACE_LIMIT_REACHED', [
                    'limit' => $maxWorkspaces,
                ]),
                'code' => 'WORKSPACE_LIMIT_REACHED',
                'limit' => $maxWorkspaces,
                'current' => $currentWorkspacesCount,
            ];
        }

        return [
            'allowed' => true,
            'reason' => null,
            'code' => null,
            'limit' => $maxWorkspaces,
            'current' => $currentWorkspacesCount,
        ];
    }

    /**
     * Check if tenant can connect a new Ecommerce store.
     *
     * @param Tenant $tenant
     * @param int $additional Number of stores trying to connect (default 1)
     * @return array ['allowed' => bool, 'reason' => string|null, 'code' => string|null, 'limit' => int, 'current' => int]
     */
    public function canConnectEcommerceStore(Tenant $tenant, int $additional = 1): array
    {
        if ($tenant->status === 'suspended') {
            return [
                'allowed' => false,
                'reason' => self::trans('TENANT_SUSPENDED'),
                'code' => 'TENANT_SUSPENDED',
                'limit' => 0,
                'current' => 0,
            ];
        }

        $plan = $tenant->plan;
        $limit = $tenant->getEcommerceStoresLimit();

        $current = \App\Models\EcommerceConnection::where('tenant_id', $tenant->id)->count();

        if ($limit === -1) {
            return ['allowed' => true, 'reason' => null, 'code' => null, 'limit' => -1, 'current' => $current];
        }

        if (($additional === 0 && $current >= $limit) || ($additional > 0 && ($current + $additional) > $limit)) {
            return [
                'allowed' => false,
                'reason' => self::trans('MAX_ECOMMERCE_STORES_LIMIT_REACHED', [
                    'limit' => $limit,
                    'plan' => $plan?->name ?? 'Free',
                ]),
                'code' => 'MAX_ECOMMERCE_STORES_LIMIT_REACHED',
                'limit' => $limit,
                'current' => $current,
            ];
        }

        return ['allowed' => true, 'reason' => null, 'code' => null, 'limit' => $limit, 'current' => $current];
    }

    /**
     * Check if tenant can add/sync more products to their catalog.
     *
     * @param Tenant $tenant
     * @param int $additional Number of products trying to add (default 1)
     * @return array ['allowed' => bool, 'reason' => string|null, 'code' => string|null, 'limit' => int, 'current' => int]
     */
    public function canAddEcommerceProduct(Tenant $tenant, int $additional = 1): array
    {
        if ($tenant->status === 'suspended') {
            return [
                'allowed' => false,
                'reason' => self::trans('TENANT_SUSPENDED'),
                'code' => 'TENANT_SUSPENDED',
                'limit' => 0,
                'current' => 0,
            ];
        }

        $plan = $tenant->plan;
        $limit = $tenant->getEcommerceProductsLimit();

        $current = \App\Models\EcommerceProduct::where('tenant_id', $tenant->id)->count();

        if ($limit === -1) {
            return ['allowed' => true, 'reason' => null, 'code' => null, 'limit' => -1, 'current' => $current];
        }

        if (($additional === 0 && $current >= $limit) || ($additional > 0 && ($current + $additional) > $limit)) {
            return [
                'allowed' => false,
                'reason' => self::trans('MAX_ECOMMERCE_PRODUCTS_LIMIT_REACHED', [
                    'limit' => $limit,
                    'plan' => $plan?->name ?? 'Free',
                ]),
                'code' => 'MAX_ECOMMERCE_PRODUCTS_LIMIT_REACHED',
                'limit' => $limit,
                'current' => $current,
            ];
        }

        return ['allowed' => true, 'reason' => null, 'code' => null, 'limit' => $limit, 'current' => $current];
    }

    /**
     * Check if tenant can process another incoming order this month.
     *
     * @param Tenant $tenant
     * @return array ['allowed' => bool, 'reason' => string|null, 'code' => string|null, 'limit' => int, 'current' => int]
     */
    public function canProcessEcommerceOrder(Tenant $tenant): array
    {
        if ($tenant->status === 'suspended') {
            return [
                'allowed' => false,
                'reason' => self::trans('TENANT_SUSPENDED'),
                'code' => 'TENANT_SUSPENDED',
                'limit' => 0,
                'current' => 0,
            ];
        }

        $plan = $tenant->plan;
        $limit = $tenant->getMonthlyEcommerceOrdersLimit();

        $current = \App\Models\EcommerceOrder::where('tenant_id', $tenant->id)
            ->whereBetween('created_at', [now()->startOfMonth(), now()->endOfMonth()])
            ->count();

        if ($limit === -1) {
            return ['allowed' => true, 'reason' => null, 'code' => null, 'limit' => -1, 'current' => $current];
        }

        if ($current >= $limit) {
            return [
                'allowed' => false,
                'reason' => self::trans('MONTHLY_ECOMMERCE_ORDERS_LIMIT_REACHED', [
                    'limit' => $limit,
                    'plan' => $plan?->name ?? 'Free',
                ]),
                'code' => 'MONTHLY_ECOMMERCE_ORDERS_LIMIT_REACHED',
                'limit' => $limit,
                'current' => $current,
            ];
        }

        return ['allowed' => true, 'reason' => null, 'code' => null, 'limit' => $limit, 'current' => $current];
    }

    /**
     * Check if tenant is permitted to use WhatsApp Abandoned Cart Recovery.
     *
     * @param Tenant $tenant
     * @return array ['allowed' => bool, 'reason' => string|null, 'code' => string|null]
     */
    public function canUseAbandonedCartRecovery(Tenant $tenant): array
    {
        if ($tenant->status === 'suspended') {
            return [
                'allowed' => false,
                'reason' => self::trans('TENANT_SUSPENDED'),
                'code' => 'TENANT_SUSPENDED',
            ];
        }

        $plan = $tenant->plan;
        $allowed = $tenant->canUseAbandonedCartRecovery();

        if (!$allowed) {
            return [
                'allowed' => false,
                'reason' => self::trans('ABANDONED_CART_RECOVERY_NOT_IN_PLAN', [
                    'plan' => $plan?->name ?? 'Current',
                ]),
                'code' => 'ABANDONED_CART_RECOVERY_NOT_IN_PLAN',
            ];
        }

        return ['allowed' => true, 'reason' => null, 'code' => null];
    }

    /**
     * Check if tenant is permitted to use Native WhatsApp Catalog Checkout.
     *
     * @param Tenant $tenant
     * @return array ['allowed' => bool, 'reason' => string|null, 'code' => string|null]
     */
    public function canUseWhatsAppCheckout(Tenant $tenant): array
    {
        if ($tenant->status === 'suspended') {
            return [
                'allowed' => false,
                'reason' => self::trans('TENANT_SUSPENDED'),
                'code' => 'TENANT_SUSPENDED',
            ];
        }

        $plan = $tenant->plan;
        $allowed = $tenant->canUseWhatsAppCheckout();

        if (!$allowed) {
            return [
                'allowed' => false,
                'reason' => self::trans('WHATSAPP_CHECKOUT_NOT_IN_PLAN', [
                    'plan' => $plan?->name ?? 'Current',
                ]),
                'code' => 'WHATSAPP_CHECKOUT_NOT_IN_PLAN',
            ];
        }

        return ['allowed' => true, 'reason' => null, 'code' => null];
    }

    /**
     * Check if tenant can connect another Meta Ad Account.
     *
     * @param Tenant $tenant
     * @return array ['allowed' => bool, 'reason' => string|null, 'code' => string|null, 'limit' => int, 'current' => int]
     */
    public function canConnectMetaAdAccount(Tenant $tenant): array
    {
        if ($tenant->status === 'suspended') {
            return [
                'allowed' => false,
                'reason' => self::trans('TENANT_SUSPENDED'),
                'code' => 'TENANT_SUSPENDED',
                'limit' => 0,
                'current' => 0,
            ];
        }

        $plan = $tenant->plan;
        $limit = $tenant->getMetaAdAccountsLimit();
        $current = \App\Models\MetaAdAccount::where('tenant_id', $tenant->id)->count();

        if ($limit === -1) {
            return ['allowed' => true, 'reason' => null, 'code' => null, 'limit' => -1, 'current' => $current];
        }

        if ($current >= $limit) {
            return [
                'allowed' => false,
                'reason' => self::trans('MAX_META_AD_ACCOUNTS_LIMIT_REACHED', [
                    'limit' => $limit,
                    'plan' => $plan?->name ?? 'Free',
                ]),
                'code' => 'MAX_META_AD_ACCOUNTS_LIMIT_REACHED',
                'limit' => $limit,
                'current' => $current,
            ];
        }

        return ['allowed' => true, 'reason' => null, 'code' => null, 'limit' => $limit, 'current' => $current];
    }

    /**
     * Check if tenant can create or activate another Meta Campaign.
     *
     * @param Tenant $tenant
     * @return array ['allowed' => bool, 'reason' => string|null, 'code' => string|null, 'limit' => int, 'current' => int]
     */
    public function canCreateMetaCampaign(Tenant $tenant): array
    {
        if ($tenant->status === 'suspended') {
            return [
                'allowed' => false,
                'reason' => self::trans('TENANT_SUSPENDED'),
                'code' => 'TENANT_SUSPENDED',
                'limit' => 0,
                'current' => 0,
            ];
        }

        $plan = $tenant->plan;
        $limit = $tenant->getMetaCampaignsLimit();
        $current = \App\Models\MetaCampaign::where('tenant_id', $tenant->id)
            ->whereIn('status', ['ACTIVE', 'PAUSED'])
            ->count();

        if ($limit === -1) {
            return ['allowed' => true, 'reason' => null, 'code' => null, 'limit' => -1, 'current' => $current];
        }

        if ($current >= $limit) {
            return [
                'allowed' => false,
                'reason' => self::trans('MAX_META_CAMPAIGNS_LIMIT_REACHED', [
                    'limit' => $limit,
                    'plan' => $plan?->name ?? 'Free',
                ]),
                'code' => 'MAX_META_CAMPAIGNS_LIMIT_REACHED',
                'limit' => $limit,
                'current' => $current,
            ];
        }

        return ['allowed' => true, 'reason' => null, 'code' => null, 'limit' => $limit, 'current' => $current];
    }

    /**
     * Check if tenant can use Click-to-WhatsApp Ads with Flows.
     *
     * @param Tenant $tenant
     * @return array ['allowed' => bool, 'reason' => string|null, 'code' => string|null]
     */
    public function canUseClickToWhatsAppAds(Tenant $tenant): array
    {
        if ($tenant->status === 'suspended') {
            return [
                'allowed' => false,
                'reason' => self::trans('TENANT_SUSPENDED'),
                'code' => 'TENANT_SUSPENDED',
            ];
        }

        $plan = $tenant->plan;
        $allowed = $tenant->canUseClickToWhatsAppAds();

        if (!$allowed) {
            return [
                'allowed' => false,
                'reason' => self::trans('CLICK_TO_WHATSAPP_ADS_NOT_IN_PLAN', [
                    'plan' => $plan?->name ?? 'Current',
                ]),
                'code' => 'CLICK_TO_WHATSAPP_ADS_NOT_IN_PLAN',
            ];
        }

        return ['allowed' => true, 'reason' => null, 'code' => null];
    }

    /**
     * Check if tenant can use Meta Lead Sync to CRM.
     *
     * @param Tenant $tenant
     * @return array ['allowed' => bool, 'reason' => string|null, 'code' => string|null]
     */
    public function canUseMetaLeadSync(Tenant $tenant): array
    {
        if ($tenant->status === 'suspended') {
            return [
                'allowed' => false,
                'reason' => self::trans('TENANT_SUSPENDED'),
                'code' => 'TENANT_SUSPENDED',
            ];
        }

        $plan = $tenant->plan;
        $allowed = $tenant->canUseMetaLeadSync();

        if (!$allowed) {
            return [
                'allowed' => false,
                'reason' => self::trans('META_LEAD_SYNC_NOT_IN_PLAN', [
                    'plan' => $plan?->name ?? 'Current',
                ]),
                'code' => 'META_LEAD_SYNC_NOT_IN_PLAN',
            ];
        }

        return ['allowed' => true, 'reason' => null, 'code' => null];
    }

    /**
     * Get Meta Ads limits and usage summary for the tenant.
     *
     * @param Tenant $tenant
     * @return array
     */
    public function getMetaAdsUsage(Tenant $tenant): array
    {
        return [
            'ad_accounts' => [
                'current' => \App\Models\MetaAdAccount::where('tenant_id', $tenant->id)->count(),
                'limit' => $tenant->getMetaAdAccountsLimit(),
            ],
            'campaigns' => [
                'current' => \App\Models\MetaCampaign::where('tenant_id', $tenant->id)->whereIn('status', ['ACTIVE', 'PAUSED'])->count(),
                'limit' => $tenant->getMetaCampaignsLimit(),
            ],
            'has_click_to_whatsapp_ads' => $tenant->canUseClickToWhatsAppAds(),
            'has_meta_lead_sync' => $tenant->canUseMetaLeadSync(),
        ];
    }

    /**
     * Check if tenant can send outbound messages under their plan message cap.
     *
     * @param Tenant $tenant
     * @return array ['allowed' => bool, 'reason' => string|null, 'code' => string|null, 'limit' => int, 'current' => int]
     */
    public function canSendOutboundMessage(Tenant $tenant): array
    {
        if ($tenant->status === 'suspended') {
            return [
                'allowed' => false,
                'reason' => self::trans('TENANT_SUSPENDED'),
                'code' => 'TENANT_SUSPENDED',
                'limit' => 0,
                'current' => 0,
            ];
        }

        $limit = $tenant->getMonthlyMessagesLimit();
        $current = $tenant->getMonthlyOutboundMessagesCount();

        // -1 indicates unlimited / uncapped (optional cap not enforced)
        if ($limit === -1) {
            return [
                'allowed' => true,
                'reason' => null,
                'code' => null,
                'limit' => -1,
                'current' => $current,
            ];
        }

        if ($current >= $limit) {
            $plan = $tenant->plan;
            return [
                'allowed' => false,
                'reason' => self::trans('MONTHLY_MESSAGES_LIMIT_REACHED', [
                    'limit' => $limit,
                    'plan' => $plan?->name ?? 'Current',
                ]),
                'code' => 'MONTHLY_MESSAGES_LIMIT_REACHED',
                'limit' => $limit,
                'current' => $current,
            ];
        }

        return [
            'allowed' => true,
            'reason' => null,
            'code' => null,
            'limit' => $limit,
            'current' => $current,
        ];
    }

    /**
     * Get message quota and usage summary for the tenant.
     *
     * @param Tenant $tenant
     * @return array
     */
    public function getMessagesUsage(Tenant $tenant): array
    {
        $limit = $tenant->getMonthlyMessagesLimit();
        $current = $tenant->getMonthlyOutboundMessagesCount();

        return [
            'limit' => $limit,
            'used' => $current,
            'is_unlimited' => $limit === -1,
            'remaining' => $limit === -1 ? -1 : max(0, $limit - $current),
        ];
    }
}

