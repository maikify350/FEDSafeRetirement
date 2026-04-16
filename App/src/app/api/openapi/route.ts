/**
 * GET /api/openapi — Returns the OpenAPI 3.0 specification for FEDSafe Retirement APIs
 */

import { NextResponse } from 'next/server'

const spec = {
  openapi: '3.0.3',
  info: {
    title: 'FEDSafe Retirement API',
    version: '1.0.0',
    description:
      'Backend API for FEDSafe Retirement — leads management, events, event check-in, FEGLI rates, IRS brackets, and agent/user management.\n\n' +
      '### OData-style Query Options\n' +
      'All list endpoints support the following query parameters:\n' +
      '- `$select` — Comma-separated column names to return (e.g. `$select=id,first_name,last_name`)\n' +
      '- `$top` — Maximum number of rows to return (e.g. `$top=25`)\n' +
      '- `$skip` — Number of rows to skip for pagination (e.g. `$skip=50`)\n' +
      '- `$orderby` — Sort column and direction (e.g. `$orderby=last_name asc`)\n' +
      '- `$filter` — Simple equality filters (e.g. `$filter=state_fk eq \'TX\'`)\n',
  },
  servers: [{ url: '/', description: 'Current host' }],
  components: {
    parameters: {
      ODataSelect: {
        name: '$select',
        in: 'query',
        required: false,
        description: 'Comma-separated list of columns to return',
        schema: { type: 'string' },
        example: 'id,first_name,last_name',
      },
      ODataTop: {
        name: '$top',
        in: 'query',
        required: false,
        description: 'Maximum number of rows to return',
        schema: { type: 'integer', minimum: 1 },
        example: 25,
      },
      ODataSkip: {
        name: '$skip',
        in: 'query',
        required: false,
        description: 'Number of rows to skip (offset)',
        schema: { type: 'integer', minimum: 0 },
        example: 0,
      },
      ODataOrderBy: {
        name: '$orderby',
        in: 'query',
        required: false,
        description: 'Column name and direction (asc/desc)',
        schema: { type: 'string' },
        example: 'last_name asc',
      },
    },
    schemas: {
      FegliRate: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          age_min: { type: 'integer' },
          age_max: { type: 'integer' },
          opt_a: { type: 'number' },
          opt_b: { type: 'number' },
          opt_c: { type: 'number' },
          notes: { type: 'string' },
          cre_by: { type: 'string' },
          cre_dt: { type: 'string', format: 'date-time' },
          mod_by: { type: 'string' },
          mod_dt: { type: 'string', format: 'date-time' },
        },
      },
      IrsBracket: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          filing_status: { type: 'string', enum: ['Single', 'Married', 'Head of Household'] },
          floor: { type: 'number' },
          ceiling: { type: 'number' },
          base_tax: { type: 'number' },
          marginal_rate: { type: 'number' },
          notes: { type: 'string' },
          cre_by: { type: 'string' },
          cre_dt: { type: 'string', format: 'date-time' },
          mod_by: { type: 'string' },
          mod_dt: { type: 'string', format: 'date-time' },
        },
      },
      Event: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          event_seq: { type: 'integer' },
          description: { type: 'string' },
          notes: { type: 'string', nullable: true },
          state_fk: { type: 'string' },
          city: { type: 'string' },
          event_date: { type: 'string', format: 'date', nullable: true },
          event_time: { type: 'string', nullable: true },
          duration: { type: 'integer', nullable: true },
          expected_attendees: { type: 'integer' },
          expected_guests: { type: 'integer' },
          cre_dt: { type: 'string', format: 'date-time' },
          assignedto: {
            type: 'object',
            nullable: true,
            properties: {
              id: { type: 'string', format: 'uuid' },
              first_name: { type: 'string' },
              last_name: { type: 'string' },
              email: { type: 'string' },
              color: { type: 'string', nullable: true },
            },
          },
        },
      },
      EventAttendee: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          event_fk: { type: 'string', format: 'uuid' },
          parent_fk: { type: 'string', format: 'uuid', nullable: true },
          first_name: { type: 'string' },
          last_name: { type: 'string' },
          phone: { type: 'string', nullable: true },
          email: { type: 'string', nullable: true },
          attendee_type: { type: 'integer', description: '1=Subscriber, 2=Lead/Invitee, 3=Guest' },
          checked_in: { type: 'boolean' },
          no_show: { type: 'boolean' },
          check_in_time: { type: 'string', format: 'date-time', nullable: true },
          notes: { type: 'string', nullable: true },
          cre_dt: { type: 'string', format: 'date-time' },
          upd_dt: { type: 'string', format: 'date-time' },
        },
      },
      Agent: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          first_name: { type: 'string' },
          last_name: { type: 'string' },
          email: { type: 'string' },
          color: { type: 'string', nullable: true },
        },
      },
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' },
        },
      },
    },
  },
  paths: {
    // ── FEGLI Rates ──────────────────────────────────────────────
    '/api/fegli-rates': {
      get: {
        tags: ['FEGLI Rates'],
        summary: 'List all FEGLI rates',
        parameters: [
          { name: 'includeAudit', in: 'query', schema: { type: 'boolean' }, description: 'Include audit fields (cre_by, cre_dt, mod_by, mod_dt)' },
          { name: 'age', in: 'query', schema: { type: 'integer' }, description: 'Find the rate band containing this age' },
          { name: 'ageMin', in: 'query', schema: { type: 'integer' }, description: 'Exact match on age_min' },
          { name: 'ageMax', in: 'query', schema: { type: 'integer' }, description: 'Exact match on age_max' },
          { $ref: '#/components/parameters/ODataSelect' },
          { $ref: '#/components/parameters/ODataTop' },
          { $ref: '#/components/parameters/ODataSkip' },
          { $ref: '#/components/parameters/ODataOrderBy' },
        ],
        responses: {
          '200': { description: 'Array of FEGLI rates', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/FegliRate' } } } } },
        },
      },
      post: {
        tags: ['FEGLI Rates'],
        summary: 'Create a new FEGLI rate (admin only)',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/FegliRate' } } },
        },
        responses: {
          '200': { description: 'Created rate', content: { 'application/json': { schema: { $ref: '#/components/schemas/FegliRate' } } } },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden — admin only' },
        },
      },
    },
    '/api/fegli-rates/{id}': {
      get: {
        tags: ['FEGLI Rates'],
        summary: 'Get a single FEGLI rate by ID',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'includeAudit', in: 'query', schema: { type: 'boolean' } },
        ],
        responses: { '200': { description: 'Single rate', content: { 'application/json': { schema: { $ref: '#/components/schemas/FegliRate' } } } } },
      },
      put: {
        tags: ['FEGLI Rates'],
        summary: 'Update a FEGLI rate (admin only)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/FegliRate' } } } },
        responses: {
          '200': { description: 'Updated rate' },
          '400': { description: 'Validation error' },
        },
      },
      delete: {
        tags: ['FEGLI Rates'],
        summary: 'Delete a FEGLI rate (admin only)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Deleted' } },
      },
    },

    // ── IRS Brackets ─────────────────────────────────────────────
    '/api/irs-brackets': {
      get: {
        tags: ['IRS Brackets'],
        summary: 'List all IRS tax brackets',
        parameters: [
          { name: 'includeAudit', in: 'query', schema: { type: 'boolean' }, description: 'Include audit fields' },
          { name: 'filingStatus', in: 'query', schema: { type: 'string' }, description: 'Filter by filing status (Single, Married, Head of Household)' },
          { name: 'income', in: 'query', schema: { type: 'number' }, description: 'Find bracket containing this income amount' },
          { name: 'floor', in: 'query', schema: { type: 'number' }, description: 'Exact match on floor' },
          { name: 'ceiling', in: 'query', schema: { type: 'number' }, description: 'Exact match on ceiling' },
          { $ref: '#/components/parameters/ODataSelect' },
          { $ref: '#/components/parameters/ODataTop' },
          { $ref: '#/components/parameters/ODataSkip' },
          { $ref: '#/components/parameters/ODataOrderBy' },
        ],
        responses: {
          '200': { description: 'Array of brackets', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/IrsBracket' } } } } },
        },
      },
      post: {
        tags: ['IRS Brackets'],
        summary: 'Create a new IRS bracket (admin only)',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/IrsBracket' } } } },
        responses: {
          '200': { description: 'Created bracket' },
          '400': { description: 'Validation error' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
        },
      },
    },
    '/api/irs-brackets/{id}': {
      get: {
        tags: ['IRS Brackets'],
        summary: 'Get a single bracket by ID',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'includeAudit', in: 'query', schema: { type: 'boolean' } },
        ],
        responses: { '200': { description: 'Single bracket' } },
      },
      put: {
        tags: ['IRS Brackets'],
        summary: 'Update an IRS bracket (admin only)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/IrsBracket' } } } },
        responses: { '200': { description: 'Updated bracket' }, '400': { description: 'Validation error' } },
      },
      delete: {
        tags: ['IRS Brackets'],
        summary: 'Delete an IRS bracket (admin only)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Deleted' } },
      },
    },

    // ── Events ───────────────────────────────────────────────────
    '/api/events': {
      get: {
        tags: ['Events'],
        summary: 'List all events with assigned agent info',
        parameters: [
          { $ref: '#/components/parameters/ODataSelect' },
          { $ref: '#/components/parameters/ODataTop' },
          { $ref: '#/components/parameters/ODataSkip' },
          { $ref: '#/components/parameters/ODataOrderBy' },
        ],
        responses: {
          '200': { description: 'Array of events', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Event' } } } } },
        },
      },
      post: {
        tags: ['Events'],
        summary: 'Create a new event',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['description', 'state_fk', 'city'],
                properties: {
                  description: { type: 'string' },
                  notes: { type: 'string' },
                  assignedto_fk: { type: 'string', format: 'uuid' },
                  state_fk: { type: 'string' },
                  city: { type: 'string' },
                  event_date: { type: 'string', format: 'date' },
                  event_time: { type: 'string' },
                  duration: { type: 'integer' },
                  expected_attendees: { type: 'integer' },
                  expected_guests: { type: 'integer' },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Created event' }, '400': { description: 'Validation error' } },
      },
    },

    // ── Events Lookup ────────────────────────────────────────────
    '/api/events/lookup': {
      get: {
        tags: ['Events'],
        summary: 'Find the agent assigned to an event by date, time, state, city',
        parameters: [
          { name: 'date', in: 'query', required: true, schema: { type: 'string', format: 'date' }, description: 'YYYY-MM-DD' },
          { name: 'time', in: 'query', required: true, schema: { type: 'string' }, description: 'HH:MM (24-hour)' },
          { name: 'state', in: 'query', required: true, schema: { type: 'string' }, description: '2-letter state code' },
          { name: 'city', in: 'query', required: true, schema: { type: 'string' }, description: 'City name (case-insensitive)' },
        ],
        responses: {
          '200': { description: 'Event with assigned agent' },
          '400': { description: 'Missing required params' },
          '404': { description: 'No matching event or no agent assigned' },
        },
      },
    },

    // ── Event Attendees ──────────────────────────────────────────
    '/api/event-attendees': {
      get: {
        tags: ['Event Attendees'],
        summary: 'List all attendees for an event',
        parameters: [
          { name: 'event_id', in: 'query', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Event UUID' },
          { $ref: '#/components/parameters/ODataTop' },
          { $ref: '#/components/parameters/ODataSkip' },
        ],
        responses: {
          '200': { description: 'Array of attendees', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/EventAttendee' } } } } },
          '400': { description: 'event_id is required' },
        },
      },
      post: {
        tags: ['Event Attendees'],
        summary: 'Add a new attendee to an event',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['event_fk'],
                properties: {
                  event_fk: { type: 'string', format: 'uuid' },
                  parent_fk: { type: 'string', format: 'uuid', nullable: true },
                  first_name: { type: 'string' },
                  last_name: { type: 'string' },
                  phone: { type: 'string' },
                  email: { type: 'string' },
                  attendee_type: { type: 'integer', description: '1=Subscriber, 2=Lead, 3=Guest' },
                  notes: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Created attendee' }, '400': { description: 'Validation error' } },
      },
      patch: {
        tags: ['Event Attendees'],
        summary: 'Update an attendee (check-in, no-show, info)',
        parameters: [{ name: 'id', in: 'query', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  first_name: { type: 'string' },
                  last_name: { type: 'string' },
                  phone: { type: 'string' },
                  email: { type: 'string' },
                  checked_in: { type: 'boolean', description: 'Toggle check-in; auto-sets check_in_time and clears no_show' },
                  no_show: { type: 'boolean' },
                  attendee_type: { type: 'integer' },
                  notes: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'Updated attendee' } },
      },
      delete: {
        tags: ['Event Attendees'],
        summary: 'Delete an attendee',
        parameters: [{ name: 'id', in: 'query', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Deleted' } },
      },
    },

    // ── Agents ───────────────────────────────────────────────────
    '/api/agents': {
      get: {
        tags: ['Agents'],
        summary: 'List all agents (users with agent role)',
        parameters: [
          { $ref: '#/components/parameters/ODataSelect' },
          { $ref: '#/components/parameters/ODataTop' },
          { $ref: '#/components/parameters/ODataSkip' },
        ],
        responses: {
          '200': { description: 'Array of agents', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Agent' } } } } },
        },
      },
    },

    // ── Leads ────────────────────────────────────────────────────
    '/api/leads': {
      get: {
        tags: ['Leads'],
        summary: 'List leads with server-side pagination, sorting, and filtering',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer' }, description: 'Page number (0-based)' },
          { name: 'pageSize', in: 'query', schema: { type: 'integer' }, description: 'Rows per page' },
          { name: 'sortBy', in: 'query', schema: { type: 'string' }, description: 'Sort column' },
          { name: 'sortDir', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'] } },
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Full-text search' },
          { name: 'state', in: 'query', schema: { type: 'string' }, description: 'Filter by state' },
          { name: 'gender', in: 'query', schema: { type: 'string' }, description: 'Filter by gender' },
          { name: 'favoritesOnly', in: 'query', schema: { type: 'boolean' }, description: 'Only favorites' },
          { $ref: '#/components/parameters/ODataSelect' },
          { $ref: '#/components/parameters/ODataTop' },
          { $ref: '#/components/parameters/ODataSkip' },
          { $ref: '#/components/parameters/ODataOrderBy' },
        ],
        responses: {
          '200': { description: 'Paginated leads with total count' },
        },
      },
    },
  },
  tags: [
    { name: 'FEGLI Rates', description: 'Federal Employees Group Life Insurance rate tables' },
    { name: 'IRS Brackets', description: 'IRS federal income tax brackets' },
    { name: 'Events', description: 'Event management and agent assignment' },
    { name: 'Event Attendees', description: 'Event check-in and attendee management' },
    { name: 'Agents', description: 'Agent (user) listings' },
    { name: 'Leads', description: 'Lead search and management (472K+ records)' },
  ],
}

export async function GET() {
  return NextResponse.json(spec, {
    headers: { 'Access-Control-Allow-Origin': '*' },
  })
}
