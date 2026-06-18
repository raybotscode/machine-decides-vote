import { currentWeekWindow, ensureCurrentWeek, getWeek, listDesigns, getResults } from './functions/api/db.js';

async function test() {
  const env = {
    DB: {
      prepare: () => ({
        bind: (...args) => ({
          run: async () => {
            console.log('run with:', args);
            return { success: true };
          },
          first: async () => null,
          all: async () => ({ results: [] })
        })
      })
    }
  };

  try {
    console.log('Week window:', currentWeekWindow());
    console.log('Testing ensureCurrentWeek...');
    const week = await ensureCurrentWeek(env.DB);
    console.log('Week:', JSON.stringify(week));
    console.log('Testing listDesigns...');
    const designs = await listDesigns(env.DB, '26-25');
    console.log('Designs:', designs);
    console.log('Testing getResults...');
    const results = await getResults(env.DB, '26-25');
    console.log('Results:', JSON.stringify(results));
    console.log('ALL OK');
  } catch(err) {
    console.error('ERROR:', err);
    console.error('STACK:', err.stack);
  }
}

test();
