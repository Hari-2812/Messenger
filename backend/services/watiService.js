const crypto = require('crypto');
const { getWatiConfig } = require('../config/wati');

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = [1000, 2000, 4000];

const RETRYABLE_STATUSES = new Set([
  429,
  500,
  502,
  503,
  504,
]);

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));


const normalizePhone = (phone) =>
  String(phone || '').replace(/\D/g, '');



// =================================================
// VALUE NORMALIZER (FIXES WATI OBJECT VALUES)
// =================================================

const normalizeValue = (value, fallback = '') => {

  if (!value) return fallback;

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'object') {

    return (
      value.value ||
      value.key ||
      value.text ||
      value.name ||
      fallback
    );

  }


  return String(value);

};



// =================================================
// TEMPLATE HELPERS
// =================================================

const getTemplateComponents = (template) => {

  const components =
    template.components ||
    template.template?.components ||
    [];


  return Array.isArray(components)
    ? components
    : [];

};



const pickTemplateText = (components, type) => {

  const component =
    components.find(
      (c) =>
        String(c.type || '')
        .toUpperCase() === type
    );


  return (
    normalizeValue(component?.text) ||
    normalizeValue(component?.body) ||
    normalizeValue(component?.content) ||
    normalizeValue(component?.value)
  );

};



const getTemplateBody = (template) => {

  const components =
    getTemplateComponents(template);


  return (

    pickTemplateText(
      components,
      'BODY'
    )

    ||

    normalizeValue(template.body)

    ||

    normalizeValue(template.bodyText)

    ||

    normalizeValue(template.templateBody)

    ||

    ''

  );

};



const countVariables = (text) => {

  const matches =
    [
      ...String(text || '')
        .matchAll(/\{\{(\d+)\}\}/g)
    ];


  if (!matches.length)
    return 0;


  return Math.max(
    ...matches.map(
      (m) => parseInt(m[1], 10)
    )
  );

};




// =================================================
// MAP WATI TEMPLATE
// =================================================

const mapTemplate = (template) => {


  const components =
    getTemplateComponents(template);


  const bodyText =
    getTemplateBody(template);


  const header =
    pickTemplateText(
      components,
      'HEADER'
    )
    ||
    normalizeValue(template.header);



  const footer =
    pickTemplateText(
      components,
      'FOOTER'
    )
    ||
    normalizeValue(template.footer);



  const buttonComponent =
    components.find(
      (c) =>
        String(c.type || '')
        .toUpperCase() === 'BUTTONS'
    );


  const buttons =
    Array.isArray(template.buttons)

      ?

      template.buttons

      :

      Array.isArray(buttonComponent?.buttons)

        ?

        buttonComponent.buttons

        :

        [];



  const variables =
    Array.from(

      new Set(

        [
          ...String(
            `${header} ${bodyText} ${footer}`
          )
            .matchAll(/\{\{(\d+)\}\}/g)

        ]
          .map((m) => m[0])

      )

    );



  return {


    id:
      normalizeValue(
        template.id ||
        template.templateId ||
        template.name
      ),



    name:
      normalizeValue(
        template.elementName ||
        template.name ||
        template.templateName ||
        template.title
      ),



    status:
      normalizeValue(
        template.status,
        'UNKNOWN'
      )
        .toUpperCase(),



    language:
      normalizeValue(
        template.language,
        'en_US'
      ),



    category:
      normalizeValue(
        template.category,
        'MARKETING'
      ),



    header,


    body:
      bodyText,


    bodyText,


    footer,


    buttons,


    variables,


    paramCount:
      countVariables(bodyText),


    raw:
      template,


  };


};




// =================================================
// URL BUILDER
// =================================================


const buildUrl = (path, query = {}) => {


  const { baseUrl } =
    getWatiConfig();



  if (!baseUrl) {

    throw new Error(
      'WATI_API_URL missing'
    );

  }



  const url =
    new URL(

      `${baseUrl}/api/v1/${path.replace(/^\/+/, '')}`

    );



  Object.entries(query)
    .forEach(([key, value]) => {


      if (
        value !== undefined &&
        value !== null &&
        value !== ''
      ) {


        url.searchParams.set(
          key,
          value
        );


      }


    });



  return url.toString();


};




// =================================================
// REQUEST HANDLER
// =================================================


const request = async (
  path,
  options = {},
  label = 'WATI'
) => {


  const {
    accessToken,
    baseUrl,
  } = getWatiConfig();



  console.log('WATI CONFIG', {

    baseUrl,

    tokenExists:
      Boolean(accessToken),

    tokenLength:
      accessToken?.length,

  });



  let token = accessToken || '';
  if (token.startsWith('Bearer ')) {
    token = token.substring(7);
  }

  if (!token) {
    throw new Error(
      'WATI_ACCESS_TOKEN missing'
    );
  }

  for (
    let attempt = 0;
    attempt <= MAX_RETRIES;
    attempt++
  ) {

    try {

      const response =
        await fetch(

          buildUrl(
            path,
            options.query
          ),

          {

            method:
              options.method || 'GET',

            headers: {

              Authorization:
                `Bearer ${token}`,

              'Content-Type':
                'application/json',

            },


            body:
              options.body
                ?
                JSON.stringify(options.body)
                :
                undefined,


          }


        );



      const text =
        await response.text();



      const data =
        text
          ?
          JSON.parse(text)
          :
          {};



      if (!response.ok) {


        console.error(
          'WATI ERROR',
          response.status,
          data
        );



        throw new Error(
          `WATI API Error HTTP ${response.status}`
        );


      }



      return data;



    } catch (error) {


      if (
        attempt < MAX_RETRIES
      ) {


        await sleep(
          RETRY_DELAY_MS[attempt]
        );


        continue;


      }



      throw error;


    }


  }


};





// =================================================
// RESPONSE EXTRACTION
// =================================================


const extractItems = (data) => {


  if (Array.isArray(data))
    return data;



  return (

    data.messageTemplates ||

    data.templates ||

    data.items ||

    data.result ||

    data.data ||

    []

  );


};




// =================================================
// GET TEMPLATES
// =================================================


const getApprovedTemplates =
  async ({ includeAll = false } = {}) => {


    const data =
      await request(

        'getMessageTemplates',

        {
          method: 'GET'
        },

        'WATI.templates'

      );



    const templates =
      extractItems(data)
        .map(mapTemplate);



    return {


      templates:
        includeAll

          ?

          templates

          :

          templates.filter(
            (t) =>
              t.status === 'APPROVED'
          ),



      total:
        templates.length,


    };


  };


// =================================================
// CONTACT SYNC & MESSAGING
// =================================================

const syncContact = async (contact) => {
  const phone = normalizePhone(contact.phone);
  const customParams = [
    { name: 'email', value: contact.email || '' },
    { name: 'tags', value: (contact.tags || []).join(',') }
  ];
  if (contact.customFields) {
    Object.entries(contact.customFields).forEach(([key, val]) => {
      customParams.push({ name: key, value: String(val) });
    });
  }
  const result = await request(`addContact/${phone}`, {
    method: 'POST',
    body: {
      name: contact.name,
      customParams
    }
  }, 'WATI.syncContact');

  return {
    watiContactId: result.id || result.contact?.id || null,
    raw: result
  };
};

const updateContact = async (phone, contact) => {
  const normalized = normalizePhone(phone);
  const customParams = [
    { name: 'email', value: contact.email || '' },
    { name: 'tags', value: (contact.tags || []).join(',') }
  ];
  if (contact.customFields) {
    Object.entries(contact.customFields).forEach(([key, val]) => {
      customParams.push({ name: key, value: String(val) });
    });
  }
  const result = await request(`updateContactAttributes/${normalized}`, {
    method: 'POST',
    body: {
      customParams
    }
  }, 'WATI.updateContact');
  return result;
};

const deleteContact = async (phone) => {
  const normalized = normalizePhone(phone);
  try {
    const result = await request(`deleteContact/${normalized}`, {
      method: 'POST'
    }, 'WATI.deleteContact');
    return result;
  } catch (err) {
    console.warn(`[WATI] Delete contact endpoint failed or unsupported: ${err.message}`);
    return { success: false, error: err.message };
  }
};

const sendMessage = async (phone, message) => {
  const normalized = normalizePhone(phone);
  const result = await request(`sendSessionMessage/${normalized}`, {
    method: 'POST',
    query: {
      messageText: message
    }
  }, 'WATI.sendMessage');

  return {
    success: result.result === 'success' || result.status === 'sent' || result.success || false,
    watiMessageId: result.id || result.messageId || null,
    provider: 'wati',
    status: 'sent',
    sentAt: new Date(),
    error: result.error || result.message || null
  };
};

const sendTemplateMessage = async (
  phone,
  templateName,
  parameters = {},
  languageCode = 'en_US',
  options = {}
) => {
  const normalized = normalizePhone(phone);
  const paramsArray = Array.isArray(parameters) ? parameters : (parameters?.body || []);
  const mappedParams = paramsArray.map((val, idx) => ({
    name: String(idx + 1),
    value: String(val)
  }));

  const result = await request('sendTemplateMessage', {
    method: 'POST',
    query: {
      whatsappNumber: normalized
    },
    body: {
      template_name: templateName,
      broadcast_name: options.broadcastName || `Campaign-${Date.now()}`,
      parameters: mappedParams
    }
  }, 'WATI.sendTemplateMessage');

  return {
    success: result.result === 'success' || result.status === 'sent' || result.success || false,
    watiMessageId: result.id || result.messageId || result.rawId || null,
    provider: 'wati',
    status: 'sent',
    sentAt: new Date(),
    error: result.error || result.message || null
  };
};

const replaceVariables = (templateText, contact, fields = []) => {
  if (!templateText) return '';
  const variableMap = [
    contact.name  || '',   // {{1}}
    contact.phone || '',   // {{2}}
    contact.email || '',   // {{3}}
  ];

  let result = templateText.replace(/\{\{(\d+)\}\}/g, (_, index) => {
    return variableMap[parseInt(index) - 1] || '';
  });

  result = result
    .replace(/\{\{name\}\}/gi,  contact.name  || '')
    .replace(/\{\{phone\}\}/gi, contact.phone || '')
    .replace(/\{\{email\}\}/gi, contact.email || '');

  return result;
};

const verifyWebhookSignature = (payload, signature, secret) => {
  if (!secret || !signature) return false;
  const hash = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  const sig = signature.startsWith('sha256=') ? signature.substring(7) : signature;
  try {
    return crypto.timingSafeEqual(
      Buffer.from(sig, 'hex'),
      Buffer.from(hash, 'hex')
    );
  } catch {
    return false;
  }
};


// =================================================
// EXPORTS
// =================================================


module.exports = {
  getApprovedTemplates,
  normalizePhone,
  syncContact,
  updateContact,
  deleteContact,
  sendMessage,
  sendTemplateMessage,
  replaceVariables,
  verifyWebhookSignature
};