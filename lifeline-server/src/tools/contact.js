import { tool } from "@strands-agents/sdk";
import { getServicesContacts, getRelativeContacts } from "../data/data.js";

export const getClosestContacts = tool({
  name: "get_closest_contacts",

  description:
    "Finds the closest emergency services, relatives, friends, and neighbors to the emergency location. Use this when you need to identify who should be contacted for an emergency.",

  inputSchema: {
    type: "object",
    properties: {
      latitude: {
        type: "number",
        description: "Latitude of the emergency location.",
      },
      longitude: {
        type: "number",
        description: "Longitude of the emergency location.",
      },
      limit: {
        type: "integer",
        description: "Maximum number of contacts to return.",
        minimum: 1,
        default: 10,
      },
    },
    required: ["latitude", "longitude"],
  },

  callback: async ({ latitude, longitude, limit = 5 }) => {
    const toRadians = (degrees) => (degrees * Math.PI) / 180;

    const getDistance = (lat1, lon1, lat2, lon2) => {
      const R = 6371;

      const dLat = toRadians(lat2 - lat1);
      const dLon = toRadians(lon2 - lon1);

      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRadians(lat1)) *
          Math.cos(toRadians(lat2)) *
          Math.sin(dLon / 2) ** 2;

      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      return R * c;
    };

    const contacts = [...getServicesContacts(), ...getRelativeContacts()];

    return contacts
      .map((contact) => {
        const distance = getDistance(
          latitude,
          longitude,
          contact.latitude,
          contact.longitude,
        );

        return {
          ...contact,
          distance: Number(distance.toFixed(2)),
        };
      })
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);
  },
});
