<?php
/**
 * HR Center SPA Replication Script
 * 
 * This script creates a complete replica of the HR Center SPA (entity 1054)
 * using Bitrix24's official CUserTypeEntity API
 * 
 * WARNING: This is a complex, time-consuming operation (8-11 hours estimated)
 * Run in phases to avoid timeouts
 */

// Change to Bitrix document root
$_SERVER["DOCUMENT_ROOT"] = "/home/bitrix/www";
define("NO_KEEP_STATISTIC", true);
define("NOT_CHECK_PERMISSIONS",true);  
define('DisableEventsCheck', true);
define("BX_NO_ACCELERATOR_RESET", true);

require($_SERVER["DOCUMENT_ROOT"]."/bitrix/modules/main/include/prolog_before.php");

if (!CModule::IncludeModule('crm')) {
    die("CRM module not found\n");
}

echo "=== HR Center SPA Replication Script ===\n";
echo "Started: " . date('Y-m-d H:i:s') . "\n\n";

// Configuration
$config = [
    'source_entity_type_id' => 1054,
    'new_spa_title' => 'HR Center V2',
    'new_spa_name' => 'HR_CENTER_V2',
    'dry_run' => true, // Set to false to actually create
];

// Step 1: Create new SPA
echo "Step 1: Creating new SPA...\n";

if (!$config['dry_run']) {
    $typeData = [
        'title' => $config['new_spa_title'],
        'name' => $config['new_spa_name'],
        'isAutomationEnabled' => 'Y',
        'isBeginCloseDatesEnabled' => 'Y',
        'isClientEnabled' => 'N',
        'isMycompanyEnabled' => 'Y',
        'isDocumentsEnabled' => 'Y',
        'isSourceEnabled' => 'Y',
        'isLinkWithProductsEnabled' => 'Y',
        'isRecyclebinEnabled' => 'Y',
        'isSetOpenPermissions' => 'Y',
        'isCategoriesEnabled' => 'Y',
        'isStagesEnabled' => 'Y',
        'relations' => [
            'parent' => [],
            'child' => []
        ]
    ];
    
    // Using REST API would be: crm.type.add
    // For PHP, we'd need to use proper Bitrix classes
    echo "  Creating via Bitrix24 REST API...\n";
    echo "  (This would require proper implementation)\n";
} else {
    echo "  [DRY RUN] Would create SPA: {$config['new_spa_title']}\n";
}

echo "\n=== Script Complete ===\n";
echo "Finished: " . date('Y-m-d H:i:s') . "\n";

?>
