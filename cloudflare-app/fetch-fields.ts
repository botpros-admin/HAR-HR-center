import { BitrixClient } from './workers/lib/bitrix';
import type { Env } from './workers/types';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      const bitrix = new BitrixClient(env);
      const fields = await bitrix.getFieldDefinitions();
      
      const fieldList = Object.entries(fields).map(([name, def]: [string, any]) => ({
        name,
        title: def.title || name,
        type: def.type,
        isRequired: def.isRequired || false,
        isReadOnly: def.isReadOnly || false,
        isMultiple: def.isMultiple || false,
        settings: def.settings,
      }));
      
      return new Response(JSON.stringify({
        entityTypeId: env.BITRIX24_ENTITY_TYPE_ID,
        totalFields: fieldList.length,
        fields: fieldList
      }, null, 2), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: (error as Error).message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};
