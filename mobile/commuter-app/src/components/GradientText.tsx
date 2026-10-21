import React from 'react';
import { Text, TextProps } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';

type Props = TextProps & {
  colors?: [string, string, ...string[]];
};

export default function GradientText({
  colors = ['#005D88', '#04AFFF', '#000B10'],
  style,
  ...rest
}: Props) {
  return (
    <MaskedView maskElement={<Text {...rest} style={[style, { backgroundColor: 'transparent' }]} />}>
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        {/* invisible copy: gives the gradient the exact size of the text */}
        <Text {...rest} style={[style, { opacity: 0 }]} />
      </LinearGradient>
    </MaskedView>
  );
}