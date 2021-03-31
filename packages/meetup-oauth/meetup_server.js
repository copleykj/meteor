Meetup = {};

OAuth.registerService('meetup', 2, null, query => {
  const response = getAccessToken(query);
  const accessToken = response.access_token;
  const expiresAt = (+new Date) + (1000 * response.expires_in);
  const identity = getIdentity(accessToken);
  const {
    id,
    name,
    lang,
    link,
    photo,
    country,
    city,
  } = identity;

  return {
    serviceData: {
      id,
      name,
      lang,
      link,
      photo,
      country,
      city,
      accessToken,
      expiresAt,
    },
    options: {
      profile: { name }
    },
  };
});

const getAccessToken = query => {
  const config = ServiceConfiguration.configurations.findOne({service: 'meetup'});
  if (!config)
    throw new ServiceConfiguration.ConfigError();

  let response;
  try {
    response = Meteor.wrapAsync(async () => {
      const request = await fetch(
        "https://secure.meetup.com/oauth2/access", {
          method: 'POST',
          headers: {Accept: 'application/json'},
          params: {
            code: query.code,
            client_id: config.clientId,
            client_secret: OAuth.openSecret(config.secret),
            grant_type: 'authorization_code',
            redirect_uri: OAuth._redirectUri('meetup', config),
            state: query.state
          }
        });
      const data = await request.json();
      return data;
    });
  } catch (err) {
    throw Object.assign(
      new Error(`Failed to complete OAuth handshake with Meetup. ${err.message}`),
      { response: err.response }
    );
  }

  if (response.data.error) { // if the http response was a json object with an error attribute
    throw new Error(`Failed to complete OAuth handshake with Meetup. ${response.data.error}`);
  } else {
    return response.data;
  }
};

const getIdentity = accessToken => {
  try {
    const data = Meteor.wrapAsync(async () => {
      const request = await fetch(
        "https://api.meetup.com/2/members",
        {
          method: 'GET',
          headers: { Accept: 'application/json' },
          params: {
            member_id: 'self',
            access_token: accessToken
          }
        });
      const response = await request.json();
      return response;
    });
    return data.results?[0];
  } catch (err) {
    throw Object.assign(
      new Error(`Failed to fetch identity from Meetup. ${err.message}`),
      { response: err.response }
    );
  }
};


Meetup.retrieveCredential = (credentialToken, credentialSecret) =>
  OAuth.retrieveCredential(credentialToken, credentialSecret);
