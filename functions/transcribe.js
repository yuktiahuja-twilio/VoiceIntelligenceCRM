exports.handler = async function(context, event, callback) {
  const client = context.getTwilioClient();
  console.log("Function triggered");
  const { SERVICE_SID } = context;
  const { RecordingSid, callerPhoneNumber, agentPhoneNumber } = event;

  // Log the entire event object to inspect its structure
  console.log("Event Object:", JSON.stringify(event, null, 2));

  if (!RecordingSid) {
    return callback('RecordingSid is missing from the event.');
  }

  try {
    console.log("RecordingSid:", RecordingSid);


    const channelDetails = {
      "media_properties": { "source_sid": RecordingSid },
      "participants": [
        {
          "user_id": agentPhoneNumber,
          "channel_participant": 2,
          "full_name": "Abigail Meyer",
          "email": agentPhoneNumber,
          "full_name": agentPhoneNumber,
          "image_url": "https://images.unsplash.com/photo-1438761681033-6461ffad8d80",
          "role": "Agent"
        },
        {
          "user_id": callerPhoneNumber,
          "channel_participant": 1,
          "email": callerPhoneNumber,
          "full_name": callerPhoneNumber,
          "role": "Customer"
        }
      ]
    };

    console.log("Caller Phone Number:", callerPhoneNumber);
    console.log("Agent Phone Number:", agentPhoneNumber);
    
    console.log("Channel Details:", JSON.stringify(channelDetails, null, 2));

    const transcriptResponse = await client.intelligence.v2.transcripts.create({
      channel: channelDetails,
      serviceSid: SERVICE_SID,
    });

    console.log("Transcript SID:", transcriptResponse.sid);
    return callback(null, transcriptResponse.sid);
  } catch (error) {
    console.error('Error creating Transcript:', error.message);
    return callback(error);
  }
};
