/**
 * Game types and interfaces
 */

// Ability types that a champion can have
export type AbilityType = 'Q' | 'W' | 'E' | 'R';

// Jungle monster types
export enum JungleMonsterType {
  EMBER_WARDEN = 'ember_warden',
  RAPTOR = 'raptor',
  SMALL_RAPTOR = 'small_raptor',
  BRUTE = 'brute',
  SHARD_BRUTE = 'shard_brute',
}

// Interface for a game ability
export interface IAbility {
  key: AbilityType;
  name: string;
  cooldown: number;
  manaCost: number;
  damage: number;
  range: number;
  description: string;
  duration?: number;
  aoe?: boolean;
  effectKey: string;
}

// Basic character stats
export interface ICharacterStats {
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
  attackDamage: number;
  attackSpeed: number;
  attackRange: number;
  moveSpeed: number;
}

// Interface for entities that can take damage
export interface IDamageable {
  takeDamage(amount: number): void;
  isDead(): boolean;
  getHealth(): number;
  getMaxHealth(): number;
}

// Game keybindings
export interface IKeybindings {
  abilities: {
    Q: number;
    W: number;
    E: number;
    R: number;
  };
  attack: number;
  move: string;
}

// Game settings
export interface IGameSettings {
  keybindings: {
    abilities: {
      Q: number;
      W: number;
      E: number;
      R: number;
    };
    attack: number;
    move: string;
  };
  championSpeed: number;
  showBattleLogs: boolean;
}

// Enemy configuration
export interface IEnemyConfig {
  type: string;
  name: string;
  health: number;
  damage: number;
  speed: number;
  attackRange: number;
  attackSpeed: number;
  texture: string;
  scale?: number;
  respawnTime?: number;
  experience?: number;
  isDarkLord?: boolean;
}

// Jungle monster configuration
export interface IJungleMonsterConfig {
  type: string;
  name: string;
  health: number;
  damage: number;
  speed: number;
  attackRange: number;
  attackSpeed: number;
  texture: string;
  scale?: number;
  respawnTime?: number;
  experience?: number;
  position: { x: number; y: number };
  campId: string; // Identifier for the jungle camp
}

// Game event data types
export namespace GameEventData {
  export interface PlayerDamaged {
    damage: number;
    healthRemaining: number;
    healthPercent: string;
  }

  export interface EnemyDamaged {
    enemyName: string;
    damage: number;
    healthRemaining: number;
    healthPercent: string;
  }

  export interface EnemyAttack {
    enemyName: string;
    damage: number;
    playerHealthRemaining: number;
  }

  export interface AbilityUsed {
    abilityType: AbilityType;
    abilityName: string;
    cooldown: number;
  }

  export interface LevelUp {
    level: number;
    statsGained: Partial<ICharacterStats>;
  }
}

// Asset types
export interface IAssetConfig {
  key: string;
  path?: string;
  category: string;
}

// UI Component props
export interface IUIComponentProps {
  scene: Phaser.Scene;
}

export interface IAbilityBarProps extends IUIComponentProps {
  position?: { x: number; y: number };
}

export interface IHealthBarProps extends IUIComponentProps {
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
}

// Game state
export interface IGameState {
  enemiesDefeated: number;
  gameStartTime: number;
  playerLevel: number;
  playerExperience: number;
  playerKills: number;
  gameOver: boolean;
  victory: boolean;
}
