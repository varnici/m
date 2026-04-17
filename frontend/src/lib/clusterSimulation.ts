export type ClusterParticipant = {
  id: string;
  label: string;
  orderReference: string;
  latitude: number;
  longitude: number;
  joined: boolean;
};

const randomOffset = (radiusKm: number, centerLatitude: number, index: number): [number, number] => {
  const angle = (Math.PI * 2 * index) / 5 + Math.random() * 0.5;
  const distance = Math.random() * radiusKm;
  const latitudeOffset = distance / 111.32;
  const longitudeOffset = distance / (111.32 * Math.cos((centerLatitude * Math.PI) / 180));
  return [latitudeOffset * Math.cos(angle), longitudeOffset * Math.sin(angle)];
};

export const generateClusterSimulation = (
  centerLatitude: number,
  centerLongitude: number,
  count = 5,
): ClusterParticipant[] => {
  return Array.from({ length: count }, (_, index) => {
    const [latOffset, lonOffset] = randomOffset(0.9, centerLatitude, index);
    return {
      id: `${index + 1}`,
      label: `Neighbor ${index + 1}`,
      orderReference: `VR-ORD-${1080 + index}`,
      latitude: centerLatitude + latOffset,
      longitude: centerLongitude + lonOffset,
      joined: index < 3,
    };
  });
};
