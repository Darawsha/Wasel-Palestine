import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

/**
 * Represents a route estimation between two geographical points.
 * Stores coordinates, estimated distance, duration, and metadata.
 */
@Entity('route')
export class Route {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * Starting point latitude
   */
  @Column('decimal', { precision: 10, scale: 7 })
  startLatitude: number;

  /**
   * Starting point longitude
   */
  @Column('decimal', { precision: 10, scale: 7 })
  startLongitude: number;

  /**
   * Destination latitude
   */
  @Column('decimal', { precision: 10, scale: 7 })
  endLatitude: number;

  /**
   * Destination longitude
   */
  @Column('decimal', { precision: 10, scale: 7 })
  endLongitude: number;

  /**
   * Estimated distance in kilometers
   */
  @Column('float')
  estimatedDistance: number;

  /**
   * Estimated duration in minutes
   */
  @Column('float')
  estimatedDuration: number;

  /**
   * Additional metadata explaining route conditions
   */
  @Column({ type: 'text', nullable: true })
  metadata?: string;

  /**
   * Timestamp when route was created
   */
  @CreateDateColumn()
  createdAt: Date;
}