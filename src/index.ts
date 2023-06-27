const xml2js = require('xml2js');
const { promisify } = require('util');
import { GeoJsonObject, GeoJsonProperties, Feature, Point, LineString, Polygon } from 'geojson';

export interface KmlIconStyleProps {
    'icon-color'?: string;
    'icon-opacity'?: number;
    'icon-size'?: number;
    'icon-image'?: string;
    'text-color'?: string;
    'text-opacity'?: number;
    'text-size'?: number;
}

export interface KmlLineStyleProps {
    'line-color'?: string;
    'line-opacity'?: number;
    'line-width'?: number;
}

export interface KmlPolyStyleProps {
    'fill-color'?: string;
    'fill-opacity'?: number;
    'fill-outline-color'?: string;
}

export type KmlStyleProps = KmlIconStyleProps | KmlLineStyleProps | KmlPolyStyleProps;

export type KmlPointFeature<P = GeoJsonProperties> = Omit<Feature<Point, (P & KmlIconStyleProps)>, "bbox">;

export type KmlLineFeature<P = GeoJsonProperties> = Omit<Feature<LineString, (P & KmlLineStyleProps)>, "bbox">;

export type KmlPolyFeature<P = GeoJsonProperties> = Omit<Feature<Polygon, (P & KmlPolyStyleProps)>, "bbox">;

export type KmlFeature<P = GeoJsonProperties> = KmlPointFeature<P> | KmlLineFeature<P> | KmlPolyFeature<P>;

export interface KmlGeojson<P = GeoJsonProperties> {
    type: 'FeatureCollection';
    features: Array<KmlFeature<P>>;
}

export class convertKMLtoGeoJSON {
    private parseString = promisify(xml2js.parseString);

    private readonly parseCoordinateString = (coordinates: any) => {
        const points = coordinates.split(' ').map((point: { split: (arg0: string) => [any, any, any]; }) => {
            const [longitude, latitude, altitude] = point.split(',');
            return [parseFloat(longitude), parseFloat(latitude), parseFloat(altitude)];
        });

        return points.length === 1 ? points[0] : points;
    }

    private readonly parseStyle = (style: any) => {
        const iconStyle = style.IconStyle;
        const icon = iconStyle && iconStyle.Icon;
        const color = iconStyle && iconStyle.color;
        const href = icon && icon.href;

        return {
            color: color || null,
            href: href || null,
        };
    }

    public readonly parse = async (kmlString: string): Promise<
        GeoJsonObject
    > => {
        const kml = await this.parseString(kmlString, {explicitArray: false});
        const placemarks = kml.kml.Document.Placemark;

        const features = placemarks.map( (placemark: any ) => {
            const {name, description, ExtendedData, Point, Style} = placemark;
            const {coordinates} = Point;

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
                coordinates: this.parseCoordinateString(coordinates),
            };

            const style = this.parseStyle(Style);
            properties.style = style;

            return {
                type: 'Feature',
                properties,
                geometry,
            };
        });

        const geoJSON: KmlGeojson = {
            type: 'FeatureCollection',
            features,
        };

        return geoJSON;

    }
}
