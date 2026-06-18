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
        description: 'Comma-separated list of columns to return (use column names from the specific table)',
        schema: { type: 'string' },
      },
      ODataTop: {
        name: '$top',
        in: 'query',
        required: false,
        description: 'Maximum number of rows to return',
        schema: { type: 'integer', minimum: 1 },
      },
      ODataSkip: {
        name: '$skip',
        in: 'query',
        required: false,
        description: 'Number of rows to skip (offset)',
        schema: { type: 'integer', minimum: 0 },
      },
      ODataOrderBy: {
        name: '$orderby',
        in: 'query',
        required: false,
        description: 'Column name and direction (asc/desc)',
        schema: { type: 'string' },
      },
    },
    schemas: {
      FegliRateEmployee: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          age_min: { type: 'integer' },
          age_max: { type: 'integer' },
          basic: { type: 'number' },
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
      FegliRateAnnuitant: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          age_min: { type: 'integer' },
          age_max: { type: 'integer' },
          basic_75: { type: 'number' },
          basic_50: { type: 'number' },
          basic_0: { type: 'number' },
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
      WebsiteLeadSubmission: {
        type: 'object',
        description: 'Browser-safe payload submitted by the static FedSafe marketing website.',
        properties: {
          formType: {
            type: 'string',
            enum: ['retirement-review', 'newsletter', 'contact', 'checklist', 'agency-briefing', 'who-we-are-video', 'generic'],
          },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string' },
          agency: { type: 'string' },
          yearsOfService: { type: 'string' },
          dateOfBirth: { type: 'string' },
          questionsComments: { type: 'string' },
          sourcePage: { type: 'string' },
          referrer: { type: 'string' },
          website: {
            type: 'string',
            description: 'Hidden honeypot field. Leave blank.',
          },
        },
        additionalProperties: true,
      },
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' },
        },
      },
      EchowinWebhookPayload: {
        type: 'object',
        required: ['id', 'from'],
        properties: {
          id:           { type: 'string', format: 'uuid', description: 'Unique call ID from echowin' },
          from:         { type: 'string', description: 'Caller phone number (E.164)' },
          to:           { type: 'string', description: 'Agent phone number (E.164)' },
          type:         { type: 'string', enum: ['INCOMING', 'OUTGOING'] },
          createdAt:    { type: 'string', format: 'date-time' },
          duration:     { type: 'integer', description: 'Call duration in seconds', nullable: true },
          summary:      { type: 'string', description: 'AI-generated call summary', nullable: true },
          score:        { type: 'number', description: 'Quality score 0–1', nullable: true },
          quality:      { type: 'string', description: 'Quality label (e.g. Excellent)', nullable: true },
          sentiment: {
            type: 'object',
            nullable: true,
            properties: {
              happy:   { type: 'number' },
              sad:     { type: 'number' },
              angry:   { type: 'number' },
              neutral: { type: 'number' },
            },
          },
          recordingUrl: { type: 'string', nullable: true },
          transcript: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                sender:    { type: 'string', enum: ['agent', 'caller'] },
                text:      { type: 'string' },
                timestamp: { type: 'string', format: 'date-time', nullable: true },
              },
            },
          },
        },
      },
    },
  },
  paths: {
    // ── FEGLI Rates – Employee ───────────────────────────────────
    '/api/fegli-rates-employee': {
      get: {
        tags: ['FEGLI Rates – Employee'],
        summary: 'List all employee FEGLI rates',
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
          '200': { description: 'Array of employee FEGLI rates', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/FegliRateEmployee' } } } } },
        },
      },
      post: {
        tags: ['FEGLI Rates – Employee'],
        summary: 'Create a new employee FEGLI rate (admin only)',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/FegliRateEmployee' } } },
        },
        responses: {
          '200': { description: 'Created rate', content: { 'application/json': { schema: { $ref: '#/components/schemas/FegliRateEmployee' } } } },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden — admin only' },
        },
      },
    },
    '/api/fegli-rates-employee/{id}': {
      get: {
        tags: ['FEGLI Rates – Employee'],
        summary: 'Get a single employee FEGLI rate by ID',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'includeAudit', in: 'query', schema: { type: 'boolean' } },
        ],
        responses: { '200': { description: 'Single rate', content: { 'application/json': { schema: { $ref: '#/components/schemas/FegliRateEmployee' } } } } },
      },
      put: {
        tags: ['FEGLI Rates – Employee'],
        summary: 'Update an employee FEGLI rate (admin only)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/FegliRateEmployee' } } } },
        responses: {
          '200': { description: 'Updated rate' },
          '400': { description: 'Validation error' },
        },
      },
      delete: {
        tags: ['FEGLI Rates – Employee'],
        summary: 'Delete an employee FEGLI rate (admin only)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Deleted' } },
      },
    },

    // ── FEGLI Rates – Annuitant ──────────────────────────────────
    '/api/fegli-rates-annuitant': {
      get: {
        tags: ['FEGLI Rates – Annuitant'],
        summary: 'List all annuitant FEGLI rates',
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
          '200': { description: 'Array of annuitant FEGLI rates', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/FegliRateAnnuitant' } } } } },
        },
      },
      post: {
        tags: ['FEGLI Rates – Annuitant'],
        summary: 'Create a new annuitant FEGLI rate (admin only)',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/FegliRateAnnuitant' } } },
        },
        responses: {
          '200': { description: 'Created rate', content: { 'application/json': { schema: { $ref: '#/components/schemas/FegliRateAnnuitant' } } } },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden — admin only' },
        },
      },
    },
    '/api/fegli-rates-annuitant/{id}': {
      get: {
        tags: ['FEGLI Rates – Annuitant'],
        summary: 'Get a single annuitant FEGLI rate by ID',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'includeAudit', in: 'query', schema: { type: 'boolean' } },
        ],
        responses: { '200': { description: 'Single rate', content: { 'application/json': { schema: { $ref: '#/components/schemas/FegliRateAnnuitant' } } } } },
      },
      put: {
        tags: ['FEGLI Rates – Annuitant'],
        summary: 'Update an annuitant FEGLI rate (admin only)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/FegliRateAnnuitant' } } } },
        responses: {
          '200': { description: 'Updated rate' },
          '400': { description: 'Validation error' },
        },
      },
      delete: {
        tags: ['FEGLI Rates – Annuitant'],
        summary: 'Delete an annuitant FEGLI rate (admin only)',
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

    // ── Website Lead Intake ─────────────────────────────────────
    '/api/public/website-lead': {
      post: {
        tags: ['Website Intake'],
        summary: 'Accept a public marketing website form submission',
        description:
          'Receives browser-safe form submissions from the static FedSafe website and stores them in lead_funnel. ' +
          'This endpoint intentionally does not require WEBHOOK_SECRET because it is called by public website JavaScript.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/WebsiteLeadSubmission' },
              examples: {
                newsletter: {
                  summary: 'Newsletter signup',
                  value: {
                    formType: 'newsletter',
                    firstName: 'Jane',
                    lastName: 'Doe',
                    email: 'jane@example.com',
                    sourcePage: 'https://fed-safe-retirement-web-site.vercel.app/retirement-updates/',
                  },
                },
                retirementReview: {
                  summary: 'Retirement review request',
                  value: {
                    formType: 'retirement-review',
                    firstName: 'John',
                    lastName: 'Smith',
                    email: 'john@example.com',
                    phone: '771-333-7233',
                    agency: 'USPS',
                    yearsOfService: '24',
                    questionsComments: 'I want to understand eligibility and timing.',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Submission accepted',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ok: { type: 'boolean' },
                    id: { type: 'string', format: 'uuid' },
                    skipped: { type: 'boolean', description: 'True when a honeypot submission was ignored' },
                  },
                },
              },
            },
          },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '500': { description: 'Supabase write error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
      options: {
        tags: ['Website Intake'],
        summary: 'CORS preflight for website lead intake',
        responses: { '204': { description: 'CORS preflight accepted' } },
      },
    },

    // ── Partner / Rep Bios (public feed) ────────────────────────
    '/api/public/partner-bios': {
      get: {
        tags: ['Website Intake'],
        summary: 'Public feed of partner/rep biographies',
        description:
          'Returns every user that has a short and/or long bio, for the marketing website to consume. ' +
          'The app is the source of truth for these bios. No auth is required (the data is already public); ' +
          'CORS is open and only safe public-facing fields are returned.',
        parameters: [
          { name: 'email', in: 'query', required: false, schema: { type: 'string' }, description: 'Return a single user by email' },
        ],
        responses: {
          '200': {
            description: 'Partner bios',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    count: { type: 'integer' },
                    partners: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string', format: 'uuid' },
                          first_name: { type: 'string' },
                          last_name: { type: 'string' },
                          full_name: { type: 'string' },
                          email: { type: 'string' },
                          role: { type: 'string' },
                          avatar_url: { type: 'string', nullable: true },
                          bio_short: { type: 'string', description: 'HTML rich text — short summary' },
                          bio_long: { type: 'string', description: 'HTML rich text — full biography' },
                          updated_at: { type: 'string', format: 'date-time', nullable: true },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '500': { description: 'Supabase read error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
      options: {
        tags: ['Website Intake'],
        summary: 'CORS preflight for partner bios feed',
        responses: { '204': { description: 'CORS preflight accepted' } },
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

    // ── Leads Bulk Export ────────────────────────────────────────
    '/api/leads/export': {
      get: {
        tags: ['Leads'],
        summary: 'Bulk-export leads matching the same filters as /api/leads (JSON or CSV)',
        description:
          'Returns the full unpaginated result set for the given filter combination, capped ' +
          'at 50,000 rows. Use this for "Export All" actions on the leads grid. For radius-based ' +
          'exports use /api/leads/radius/export instead.',
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Global text search across name/occupation/facility/city' },
          { name: 'state', in: 'query', schema: { type: 'string' }, description: '2-letter state code shortcut' },
          { name: 'gender', in: 'query', schema: { type: 'string' }, description: 'M | F' },
          { name: 'favorite', in: 'query', schema: { type: 'string' }, description: '"true" to limit to favorites only' },
          { name: 'filters', in: 'query', schema: { type: 'string' }, description: 'JSON-encoded column-filter array (same shape as /api/leads)' },
          { name: 'sort', in: 'query', schema: { type: 'string' }, description: 'JSON-encoded sort array (same shape as /api/leads)' },
          { name: 'max', in: 'query', schema: { type: 'integer', default: 50000, maximum: 50000 }, description: 'Hard ceiling on rows returned' },
          { name: 'format', in: 'query', schema: { type: 'string', enum: ['json', 'csv'], default: 'json' }, description: 'Response format' },
        ],
        responses: {
          '200': {
            description: 'All matching leads (JSON) or CSV download',
            content: {
              'application/json': { schema: { type: 'object', properties: {
                data:   { type: 'array', items: { type: 'object' } },
                total:  { type: 'integer' },
                capped: { type: 'boolean' },
              } } },
              'text/csv': { schema: { type: 'string', format: 'binary' } },
            },
          },
          '500': { description: 'Server-side filter or RPC error' },
        },
      },
    },

    // ── Radius Search ────────────────────────────────────────────
    '/api/leads/radius': {
      get: {
        tags: ['Leads'],
        summary: 'Find leads within a geographic radius of an address',
        description:
          'Geocodes the supplied address (or skips geocoding when lat/lon are passed) and returns ' +
          'leads ordered by distance from the centre point. Pagination works the same way as ' +
          '/api/leads. For full result-set downloads use /api/leads/radius/export.',
        parameters: [
          { name: 'address', in: 'query', schema: { type: 'string' }, description: 'Address string to geocode (omit if lat/lon are supplied)' },
          { name: 'lat', in: 'query', schema: { type: 'number' }, description: 'Centre latitude (skip geocoding when present together with lon)' },
          { name: 'lon', in: 'query', schema: { type: 'number' }, description: 'Centre longitude' },
          { name: 'radius', in: 'query', schema: { type: 'number', default: 25 }, description: 'Radius in miles' },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 0 }, description: 'Page number (0-based)' },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 25 }, description: 'Rows per page' },
          { name: 'stateCounts', in: 'query', schema: { type: 'boolean' }, description: 'When true, includes a per-state lead-count breakdown in the response' },
          { name: 'facilities', in: 'query', schema: { type: 'boolean' }, description: 'When true, includes the unique-facility list (one entry per location) for map markers' },
        ],
        responses: {
          '200': { description: 'Paginated leads inside the radius, plus optional facility/state breakdowns' },
          '400': { description: 'Missing required address or lat/lon' },
          '404': { description: 'Address could not be geocoded' },
          '500': { description: 'RPC or geocoding failure' },
        },
      },
    },

    '/api/leads/radius/export': {
      get: {
        tags: ['Leads'],
        summary: 'Bulk-export every lead inside a radius (JSON or CSV)',
        description:
          'Bypasses pagination and returns the full set of leads inside the requested radius, ' +
          'capped at 50,000 rows. JSON returns `{ data, total, center, radius, capped }`; ' +
          'CSV returns an attachment with the standard lead-export columns plus distance.',
        parameters: [
          { name: 'address', in: 'query', schema: { type: 'string' }, description: 'Address string to geocode (omit if lat/lon are supplied)' },
          { name: 'lat', in: 'query', schema: { type: 'number' }, description: 'Centre latitude' },
          { name: 'lon', in: 'query', schema: { type: 'number' }, description: 'Centre longitude' },
          { name: 'radius', in: 'query', schema: { type: 'number', default: 25 }, description: 'Radius in miles' },
          { name: 'max', in: 'query', schema: { type: 'integer', default: 50000, maximum: 50000 }, description: 'Hard ceiling on rows returned' },
          { name: 'format', in: 'query', schema: { type: 'string', enum: ['json', 'csv'], default: 'json' }, description: 'Response format' },
        ],
        responses: {
          '200': {
            description: 'All matching leads (JSON) or CSV download',
            content: {
              'application/json': { schema: { type: 'object', properties: {
                data:   { type: 'array', items: { type: 'object' } },
                total:  { type: 'integer' },
                center: { type: 'object', properties: { lat: { type: 'number' }, lon: { type: 'number' } } },
                radius: { type: 'number' },
                capped: { type: 'boolean', description: 'True when the row count hit the `max` ceiling' },
              } } },
              'text/csv': { schema: { type: 'string', format: 'binary' } },
            },
          },
          '400': { description: 'Missing required address or lat/lon' },
          '404': { description: 'Address could not be geocoded' },
          '500': { description: 'RPC or geocoding failure' },
        },
      },
    },

    // ── echowin ──────────────────────────────────────────────────
    '/api/echowin/webhook': {
      post: {
        tags: ['echowin'],
        summary: 'Post-call webhook receiver (configure this URL in echowin dashboard)',
        description:
          'echowin POSTs this endpoint after every call ends. The payload is parsed by Claude ' +
          'to extract registration data (name, email, phone, address, conference location, retirement year, guest), ' +
          'then upserted into the `echo_leads` Supabase table.\n\n' +
          '**Webhook URL to enter in echowin:**\n' +
          '`https://fedsafe-retirement.vercel.app/api/echowin/webhook`',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/EchowinWebhookPayload' },
              example: {
                id: '550e8400-e29b-41d4-a716-446655440000',
                from: '+14155551234',
                to: '+18005551234',
                type: 'INCOMING',
                createdAt: '2024-01-22T18:30:00.000Z',
                duration: 127,
                summary: 'Caller registered for the Greenville seminar.',
                score: 0.92,
                quality: 'Excellent',
                sentiment: { happy: 0.75, sad: 0.05, angry: 0.02, neutral: 0.18 },
                recordingUrl: 'https://cr.files.echo.win/abc123...',
                transcript: [
                  { sender: 'agent',  text: 'Which conference would you like to attend?' },
                  { sender: 'caller', text: 'Greenville, South Carolina please.' },
                  { sender: 'agent',  text: 'Great! Can I get your full name?' },
                  { sender: 'caller', text: 'John Smith' },
                ],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Parsed and saved to echo_leads',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ok:                 { type: 'boolean' },
                    callId:             { type: 'string' },
                    name:               { type: 'string', nullable: true },
                    conferenceLocation: { type: 'string', nullable: true, enum: ['Lexington, Kentucky', 'Greenville, South Carolina'] },
                    confidence:         { type: 'string', enum: ['high', 'medium', 'low'] },
                  },
                },
              },
            },
          },
          '400': { description: 'Invalid JSON or missing required fields' },
          '500': { description: 'Supabase write error' },
        },
      },
    },

    '/api/echowin/sync': {
      get: {
        tags: ['echowin'],
        summary: 'Get last sync status and total echo_leads count',
        responses: {
          '200': {
            description: 'Sync metadata',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    lastSync:   { type: 'string', format: 'date-time', nullable: true },
                    totalLeads: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['echowin'],
        summary: 'Manually trigger a backfill sync from echowin call history',
        description: 'Polls echowin for all calls since the last sync, parses each transcript, and upserts into echo_leads. The Vercel cron runs this automatically every 15 minutes.',
        responses: {
          '200': {
            description: 'Sync results',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    synced:  { type: 'integer' },
                    skipped: { type: 'integer' },
                    errors:  { type: 'integer' },
                    total:   { type: 'integer' },
                  },
                },
              },
            },
          },
        },
      },
    },

    '/api/echowin/calls': {
      get: {
        tags: ['echowin'],
        summary: 'Browse raw call logs from echowin',
        parameters: [
          { name: 'page',    in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit',   in: 'query', schema: { type: 'integer', default: 25, maximum: 100 } },
          { name: 'agentId', in: 'query', schema: { type: 'string', format: 'uuid' }, description: 'Filter by echowin agent ID' },
          { name: 'after',   in: 'query', schema: { type: 'string', format: 'date-time' }, description: 'Only calls created after this ISO timestamp' },
        ],
        responses: {
          '200': { description: 'Paginated call list from echowin API' },
          '500': { description: 'echowin API error' },
        },
      },
    },
  },
  tags: [
    { name: 'FEGLI Rates – Employee', description: 'FEGLI rate tables for active employees' },
    { name: 'FEGLI Rates – Annuitant', description: 'FEGLI rate tables for annuitants/retirees' },
    { name: 'IRS Brackets', description: 'IRS federal income tax brackets' },
    { name: 'Events', description: 'Event management and agent assignment' },
    { name: 'Event Attendees', description: 'Event check-in and attendee management' },
    { name: 'Agents', description: 'Agent (user) listings' },
    { name: 'Leads', description: 'Lead search and management (472K+ records)' },
    { name: 'echowin', description: 'AI phone agent integration — post-call webhooks and seminar registration leads' },
  ],
}

export async function GET() {
  return NextResponse.json(spec, {
    headers: { 'Access-Control-Allow-Origin': '*' },
  })
}
