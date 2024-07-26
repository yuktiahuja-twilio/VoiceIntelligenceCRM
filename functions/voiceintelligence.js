const axios = require('axios');

exports.handler = async function(context, event, callback) {
  const twilioClient = context.getTwilioClient();
  const hubspotApiKey = context.HUBSPOT_TOKEN;
  const hubspotBaseUrl = 'https://api.hubapi.com';
  

  const transactionSid = event.transcript_sid;

  if (!transactionSid) {
    return callback('TransactionSid is missing from the event.');
  }

  try {
    const operatorResults = await getOperatorResults(twilioClient, transactionSid);
    const transcriptResponse = await getTranscriptResponse(twilioClient, transactionSid);
    const phoneNumber = extractPhoneNumber(transcriptResponse);
    const { callDate, callTime } = extractCallDateTime(transcriptResponse);

    const contactData = extractContactData(operatorResults, phoneNumber, callDate, callTime);
    const hubspotResponse = await createHubSpotContact(contactData, hubspotApiKey, hubspotBaseUrl);

    console.log(hubspotResponse);
    callback(null, `HubSpot contact created: ${hubspotResponse}`);
  } catch (error) {
    console.error('Error creating HubSpot contact:', error);
    callback(error);
  }
};

async function getOperatorResults(client, sid) {
  try {
    const operatorResults = await client.intelligence.v2
      .transcripts(sid)
      .operatorResults
      .list({ limit: 20 });

    let person = null;
    let location = null;
    let summary = null;
    const entityMap = {};

    for (const record of operatorResults) {
      if (record.name.toLowerCase() === 'entity recognition') {
        for (const utterance of record.utteranceResults) {
          for (const part of utterance.utterance_parts) {
            entityMap[part.label] = part.text;
          }
        }
        person = entityMap.Person;
        location = entityMap.Location;
      } else if (record.name.toLowerCase() === 'conversation summary') {
        summary = record.textGenerationResults.result;
      }
    }

    return {
      person,
      location,
      summary
    };
  } catch (error) {
    throw new Error(`Error fetching operator results: ${error.message}`);
  }
}

async function getTranscriptResponse(client, transcriptSid) {
  try {
    const transcriptResponse = await client.intelligence.v2
      .transcripts(transcriptSid)
      .fetch();
    return transcriptResponse;
  } catch (error) {
    throw new Error(`Error fetching transcript response: ${error.message}`);
  }
}

function extractPhoneNumber(transcriptResponse) {
  const phoneNumber = transcriptResponse.channel.participants.find(p => p.channel_participant === 1).media_participant_id;
  return phoneNumber;
}

function extractCallDateTime(transcriptResponse) {
  const dateCreated = transcriptResponse.dateCreated;
  let callDate = 'Unknown';
  let callTime = 'Unknown';

  try {
    const date = new Date(dateCreated);
    if (!isNaN(date.getTime())) {
      callDate = date.toISOString().split('T')[0]; // Convert to YYYY-MM-DD format
      callTime = date.toISOString().split('T')[1].split('.')[0]; // Extract time as HH:MM:SS
    } else {
      console.error('Invalid date format:', dateCreated);
    }
  } catch (error) {
    console.error('Error parsing date:', error);
  }

  return { callDate, callTime };
}


function extractContactData(operatorResults, phoneNumber, callDate, callTime) {
  console.log(operatorResults.summary);
  console.log(phoneNumber);
  const lead = 'New'; // Define the lead_status inside the function

  return {
    properties: {
      firstname: operatorResults.person || 'Unknown',
      summary: operatorResults.summary || 'No summary available',
      phone: phoneNumber || 'Unknown',
      location: operatorResults.location || 'Unknown',
      date: callDate,
      call_time: callTime,
      lead: lead
    }
  };
}

async function createHubSpotContact(contactData, apiKey, baseUrl) {
  const url = `${baseUrl}/crm/v3/objects/contacts`;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  };

  const response = await axios.post(url, contactData, { headers });
  return response.data;
}
