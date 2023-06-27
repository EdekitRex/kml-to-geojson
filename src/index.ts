const xml2js = require('xml2js');
const { promisify } = require('util');
import { GeoJsonObject } from 'geojson';

const parseString = promisify(xml2js.parseString);

function parseCoordinateString(coordinates: any) {
    const points = coordinates.split(' ').map((point: { split: (arg0: string) => [any, any, any]; }) => {
        const [longitude, latitude, altitude] = point.split(',');
        return [parseFloat(longitude), parseFloat(latitude), parseFloat(altitude)];
    });

    return points.length === 1 ? points[0] : points;
}

function parseStyle(style: { IconStyle: any; }) {
    const iconStyle = style.IconStyle;
    const icon = iconStyle && iconStyle.Icon;
    const color = iconStyle && iconStyle.color;
    const href = icon && icon.href;

    return {
        color: color || null,
        href: href || null,
    };
}

export default async function convertKMLtoGeoJSON(kmlString: any) {
    const kml = await parseString(kmlString, { explicitArray: false });
    const placemarks = kml.kml.Document.Placemark;

    const features = placemarks.map((placemark: { name: any; description: any; ExtendedData: any; Point: any; Style: any; }) => {
        const { name, description, ExtendedData, Point, Style } = placemark;
        const { coordinates } = Point;

        const properties = {
            style: {
                color: null,
                href: null,
            }
        };
        if (ExtendedData && ExtendedData.Data) {
            ExtendedData.Data.forEach((data: { displayName: any; value: any; }) => {
                const key = data.displayName;
                const value = data.value;
                // @ts-ignore
                properties[key] = value;
            });
        }

        const geometry = {
            type: 'Point',
            coordinates: parseCoordinateString(coordinates),
        };

        const style = parseStyle(Style);
        properties.style = style;

        return {
            type: 'Feature',
            properties,
            geometry,
        };
    });

    const geoJSON = {
        type: 'FeatureCollection',
        features,
    };

    return geoJSON;
}
