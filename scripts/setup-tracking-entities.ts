/**
 * TRANSHERE v1.1 - Tracking Entity Setup
 *
 * PURPOSE: Create sources, subtags, and tracking links for all models
 * EXECUTION: npx tsx scripts/setup-tracking-entities.ts
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

// Load .env.local
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Define the source/subtag matrix
const SOURCE_MATRIX = [
  { name: 'Instagram', slug: 'instagram', is_custom: false },
  { name: 'X', slug: 'x', is_custom: false },
  { name: 'Reddit', slug: 'reddit', is_custom: false },
  { name: 'Model Directory', slug: 'model-directory', is_custom: true },
] as const;

const SUBTAG_NAMES = ['Bio Link', 'Story', 'Direct Message'] as const;

async function setupTrackingEntities() {
  console.log('🔧 Setting up tracking entities...\n');

  // Step 1: Upsert Traffic Sources
  console.log('1. Creating/Updating traffic sources...');
  const sourceIds: Record<string, string> = {};

  for (const source of SOURCE_MATRIX) {
    // Check if exists
    const { data: existing } = await supabase
      .from('tracking_sources')
      .select('id')
      .eq('slug', source.slug)
      .single();

    if (existing) {
      sourceIds[source.name] = existing.id;
      console.log(`   ○ ${source.name} already exists (${existing.id})`);
    } else {
      const { data, error } = await supabase
        .from('tracking_sources')
        .insert({
          name: source.name,
          slug: source.slug,
          is_custom: source.is_custom,
        })
        .select('id')
        .single();

      if (error) throw new Error(`Failed to create source ${source.name}: ${error.message}`);
      sourceIds[source.name] = data.id;
      console.log(`   ✓ Created ${source.name} (${data.id})`);
    }
  }

  // Step 2: Create Subtags for each source
  console.log('\n2. Creating subtags for each source...');
  const subtagIds: Record<string, Record<string, string>> = {};

  for (const [sourceName, sourceId] of Object.entries(sourceIds)) {
    subtagIds[sourceName] = {};

    for (const subtagName of SUBTAG_NAMES) {
      const slug = `${sourceName.toLowerCase().replace(/\s+/g, '-')}-${subtagName.toLowerCase().replace(/\s+/g, '-')}`;

      // Check if exists
      const { data: existing } = await supabase
        .from('tracking_subtags')
        .select('id')
        .eq('source_id', sourceId)
        .eq('name', subtagName)
        .single();

      if (existing) {
        subtagIds[sourceName][subtagName] = existing.id;
      } else {
        const { data, error } = await supabase
          .from('tracking_subtags')
          .insert({
            source_id: sourceId,
            name: subtagName,
            slug: slug,
          })
          .select('id')
          .single();

        if (error) throw new Error(`Failed to create subtag: ${error.message}`);
        subtagIds[sourceName][subtagName] = data.id;
      }
    }
    console.log(`   ✓ ${sourceName}: 3 subtags configured`);
  }

  // Step 3: Fetch all models
  console.log('\n3. Fetching models...');
  const { data: models, error: modelsError } = await supabase
    .from('models')
    .select('id, slug, name');

  if (modelsError) throw new Error(`Failed to fetch models: ${modelsError.message}`);
  console.log(`   ✓ Found ${models.length} models`);

  // Step 4: Generate 2-3 tracking links per model
  console.log('\n4. Generating tracking links...');
  let totalLinks = 0;
  const sourceNames = Object.keys(sourceIds);

  for (const model of models) {
    // Generate 2-3 links per model
    const linkCount = Math.floor(Math.random() * 2) + 2; // 2 or 3

    for (let i = 0; i < linkCount; i++) {
      const sourceName = sourceNames[i % sourceNames.length];
      const sourceId = sourceIds[sourceName];
      const subtags = Object.values(subtagIds[sourceName]);
      const subtagId = subtags[Math.floor(Math.random() * subtags.length)];

      const linkSlug = `${model.slug}-${sourceName.toLowerCase().replace(/\s+/g, '-')}-${randomUUID().slice(0, 8)}`;

      // Create the tracking link (don't check for existing - we want multiple per model)
      const { error } = await supabase
        .from('tracking_links')
        .insert({
          organization_id: null, // Admin context
          model_id: model.id,
          source_id: sourceId,
          subtag_id: subtagId,
          slug: linkSlug,
          name: `${model.name} - ${sourceName}`,
          destination_url: null, // Will be set when used
          click_count: 0,
          is_active: true,
          is_archived: false,
        });

      if (error) {
        console.warn(`   ⚠ Failed to create link for ${model.slug}: ${error.message}`);
      } else {
        totalLinks++;
      }
    }
  }

  console.log(`   ✓ Created ${totalLinks} new tracking links`);

  // Step 5: Summary
  console.log('\n📊 Entity Setup Summary:');
  console.log(`   Sources: ${Object.keys(sourceIds).length}`);
  console.log(`   Subtags: ${Object.keys(sourceIds).length * SUBTAG_NAMES.length}`);
  console.log(`   Tracking Links: ${totalLinks} new`);

  // Return IDs for use in analytics generation
  return { sourceIds, subtagIds, models };
}

setupTrackingEntities().catch(console.error);