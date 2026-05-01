import { supabaseAdmin } from '../lib/supabaseAdmin.js';
import { AppError } from '../lib/AppError.js';

async function rpc(name, params = {}) {
  const { data, error } = await supabaseAdmin.rpc(name, params);
  if (error) throw new AppError('INTERNAL', error.message, 500);
  return data ?? [];
}

export const householdsByLocation = () => rpc('rpc_report_households_by_location');
export const memberDemographics   = () => rpc('rpc_report_member_demographics');
export const pregnanciesByRisk    = () => rpc('rpc_report_pregnancies_by_risk');
export const vaccinationCoverage  = () => rpc('rpc_report_vaccination_coverage');
export const diseasePrevalence    = (days = 30) => rpc('rpc_report_disease_prevalence', { p_days: days });
export const deathsMigrations = async (days = 30) => {
  const data = await rpc('rpc_report_deaths_migrations', { p_days: days });
  
  // If the RPC doesn't return household_dissolutions (because migration wasn't run),
  // we fetch it manually to ensure it's "visible in the report" as requested.
  if (!data.some(r => r.event_type === 'household_dissolutions')) {
    const { count, error } = await supabaseAdmin
      .from('households')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'dissolved')
      .gte('updated_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());
    
    if (!error) {
      data.push({ event_type: 'household_dissolutions', count: count || 0 });
    }
  }
  
  return data;
};
