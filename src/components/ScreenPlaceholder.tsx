import { Link, type Href } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export type PlaceholderLink = {
  label: string;
  href: Href;
};

export type ScreenPlaceholderProps = {
  title: string;
  description: string;
  links?: PlaceholderLink[];
};

/**
 * Shared placeholder for the MVP screens. Later PRs replace each screen's
 * body with its real implementation; this keeps navigation wired up and the
 * route set visible in the meantime.
 */
export function ScreenPlaceholder({ title, description, links = [] }: ScreenPlaceholderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {links.length > 0 && (
        <View style={styles.links}>
          {links.map((link) => (
            <Link key={`${link.label}`} href={link.href} style={styles.link}>
              {link.label}
            </Link>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    color: '#555',
    textAlign: 'center',
  },
  links: {
    marginTop: 16,
    gap: 10,
    alignItems: 'center',
  },
  link: {
    fontSize: 16,
    color: '#0a7ea4',
  },
});
