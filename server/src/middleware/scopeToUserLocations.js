import { supabaseAdmin } from '../lib/supabaseAdmin.js';

/**
 * Loads the calling user's location scope and attaches it to req.locationScope.
 * Must run after authenticate().
 *
 * req.locationScope shape:
 *   { isAdmin: true }                              — admin, no row-level restriction
 *   { isAdmin: false, districtIds: [], villageIds: [] }  — non-admin, explicit lists
 *
 * Use applyLocationScope() in services to add the WHERE filter to Supabase queries.
 */
export async function scopeToUserLocations(req, res, next) {
  if (!req.profile) {
    return res.status(401).json({ data: null, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
  }

  if (req.profile.role === 'admin') {
    req.locationScope = { isAdmin: true };
    return next();
  }

  const [districtResult, villageResult] = await Promise.all([
    supabaseAdmin
      .from('user_district_assignments')
      .select('district_id')
      .eq('profile_id', req.profile.id),
    supabaseAdmin
      .from('user_village_assignments')
      .select('village_id')
      .eq('profile_id', req.profile.id),
  ]);

  if (districtResult.error || villageResult.error) {
    return res.status(500).json({ data: null, error: { code: 'INTERNAL', message: 'Failed to load location scope' } });
  }

  req.locationScope = {
    isAdmin: false,
    districtIds: districtResult.data.map(r => r.district_id),
    villageIds: villageResult.data.map(r => r.village_id),
  };

  next();
}

/**
 * Applies a location scope filter to a Supabase PostgREST query builder.
 * The query must already be selecting from a table that has district_id and village_id columns
 * (i.e. households, or a join that surfaces those columns).
 *
 * Returns the query unchanged for admins.
 * For non-admins with no assignments, applies an impossible filter so the query returns nothing
 * rather than leaking unscoped data.
 *
 * @param {object} query  - Supabase query builder (pre-.select())
 * @param {object} scope  - req.locationScope
 * @returns {object}      - query with filter applied
 */
export function applyLocationScope(query, scope) {
  if (scope.isAdmin) return query;

  const { districtIds, villageIds } = scope;

  if (districtIds.length === 0 && villageIds.length === 0) {
    // No assignments — return nothing (not even unclassified rows)
    return query.eq('id', '00000000-0000-0000-0000-000000000000');
  }

  const filters = [];
  if (districtIds.length > 0) filters.push(`district_id.in.(${districtIds.map(id => `"${id}"`).join(',')})`);
  if (villageIds.length > 0) filters.push(`village_id.in.(${villageIds.map(id => `"${id}"`).join(',')})`);

  if (filters.length === 0) return query.eq('id', '00000000-0000-0000-0000-000000000000');
  return query.or(filters.join(','));
}

/**
 * Express guard: rejects a request if the given household_id is outside the
 * caller's location scope. Use this in detail/mutation routes.
 *
 * @param {string} householdId
 * @param {object} scope  - req.locationScope
 * @returns {boolean}     - true if access is allowed
 */
export function isHouseholdInScope(householdId, scope) {
  // Household-level checks happen via RLS (user_can_access_household) on the DB side.
  // This function is a fast pre-check for the API layer when we already have
  // the household row in memory (avoids an extra DB round-trip).
  // Pass the full household object, not just the id.
  throw new Error('Call isHouseholdObjectInScope(household, scope) — pass the full object, not just the id');
}

/**
 * @param {{ district_id: string|null, village_id: string|null }} household
 * @param {object} scope  - req.locationScope
 * @returns {boolean}
 */
export function isHouseholdObjectInScope(household, scope) {
  if (scope.isAdmin) return true;

  const { districtIds, villageIds } = scope;

  if (household.district_id && districtIds.includes(household.district_id)) return true;
  if (household.village_id && villageIds.includes(household.village_id)) return true;

  return false;
}
