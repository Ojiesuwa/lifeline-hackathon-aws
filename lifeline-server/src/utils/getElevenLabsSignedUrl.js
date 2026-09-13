export async function getElevenLabsSignedUrl() {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${process.env.ELEVENLABS_AGENT_ID}`,
    {
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY,
      },
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ElevenLabs error: ${error}`);
  }

  const data = await response.json();

  return data.signed_url;
}
